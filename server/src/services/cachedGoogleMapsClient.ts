import { prisma } from "../db/client";
import { DirectionsLeg, GoogleMapsClient } from "../types";
import { directionsRouteKey, distancePairKey, geocodeQueryKey } from "./cacheKeys";

/**
 * Envolve um GoogleMapsClient real com cache persistido (SQLite, via Prisma)
 * pra cada um dos 3 metodos. Distancia/duracao entre 2 pontos fixos e o
 * trajeto real entre uma sequencia fixa de paradas praticamente nunca mudam
 * — reotimizar sem alterar localizacoes/rotas fica quase gratis depois da
 * primeira vez. Sem TTL de proposito (ver comentario no schema.prisma).
 *
 * So embrulha o client injetado — nao muda a interface, entao nenhum
 * servico que consome `GoogleMapsClient` precisa saber que o cache existe.
 * NAO use isso pro client passado ao endpoint de diagnostico: o objetivo
 * ali e testar a conexao AGORA, um resultado cacheado mascararia uma falha
 * de verdade.
 */
export function withCache(client: GoogleMapsClient): GoogleMapsClient {
  return {
    async getDistanceMatrix({ origins, destinations }) {
      const keys: string[] = [];
      for (const o of origins) {
        for (const d of destinations) keys.push(distancePairKey(o, d));
      }

      const cached = await prisma.distanceCache.findMany({ where: { key: { in: keys } } });
      const byKey = new Map(cached.map((c) => [c.key, c]));

      if (byKey.size === keys.length) {
        const distanceMeters = origins.map((o) => destinations.map((d) => byKey.get(distancePairKey(o, d))!.distanceMeters));
        const durationSeconds = origins.map((o) => destinations.map((d) => byKey.get(distancePairKey(o, d))!.durationSeconds));
        return { distanceMeters, durationSeconds };
      }

      const result = await client.getDistanceMatrix({ origins, destinations });

      const writes: { key: string; distanceMeters: number; durationSeconds: number }[] = [];
      origins.forEach((o, i) => {
        destinations.forEach((d, j) => {
          const dist = result.distanceMeters[i]?.[j];
          const dur = result.durationSeconds[i]?.[j];
          if (dist != null && dur != null) {
            writes.push({ key: distancePairKey(o, d), distanceMeters: dist, durationSeconds: dur });
          }
        });
      });
      void writeDistanceCache(writes);

      return result;
    },

    async getDirections({ origin, destination, waypoints }) {
      const key = directionsRouteKey(origin, waypoints, destination);
      const cached = await prisma.directionsCache.findUnique({ where: { key } });
      if (cached) {
        return { encodedPolyline: cached.encodedPolyline, legs: JSON.parse(cached.legsJson) as DirectionsLeg[] };
      }

      const result = await client.getDirections({ origin, destination, waypoints });
      void prisma.directionsCache
        .upsert({
          where: { key },
          create: { key, encodedPolyline: result.encodedPolyline, legsJson: JSON.stringify(result.legs) },
          update: {},
        })
        .catch(() => {});

      return result;
    },

    async geocodeAddress(query) {
      const key = geocodeQueryKey(query);
      const cached = await prisma.geocodeCache.findUnique({ where: { key } });
      if (cached) {
        return cached.found
          ? { lat: cached.lat!, lng: cached.lng!, formattedAddress: cached.formattedAddress! }
          : null;
      }

      const result = await client.geocodeAddress(query);
      void prisma.geocodeCache
        .upsert({
          where: { key },
          create: result
            ? { key, found: true, lat: result.lat, lng: result.lng, formattedAddress: result.formattedAddress }
            : { key, found: false },
          update: {},
        })
        .catch(() => {});

      return result;
    },
  };
}

async function writeDistanceCache(writes: { key: string; distanceMeters: number; durationSeconds: number }[]) {
  try {
    await Promise.all(
      writes.map((w) =>
        prisma.distanceCache.upsert({
          where: { key: w.key },
          create: w,
          update: {},
        })
      )
    );
  } catch {
    // Cache e best-effort — uma falha aqui nao deve afetar a resposta ja calculada.
  }
}
