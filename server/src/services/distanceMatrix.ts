import { planMatrixRequests } from "../utils/chunk";
import { haversineDistanceMeters, estimateDurationSeconds } from "../utils/geo";
import { DistanceMatrix, GoogleMapsClient } from "../types";

export interface Point {
  lat: number;
  lng: number;
}

/**
 * Constroi a matriz completa NxN de distancia/duracao entre `points`,
 * respeitando os limites de tamanho da Distance Matrix API via chunking.
 * Celulas que falharem na API (ex: ZERO_RESULTS) caem para haversine,
 * para nao derrubar o pipeline inteiro por causa de um par sem rota.
 */
export async function buildDistanceMatrix(
  points: Point[],
  client: GoogleMapsClient
): Promise<DistanceMatrix> {
  const n = points.length;
  const distanceMeters: number[][] = Array.from({ length: n }, () =>
    new Array(n).fill(0)
  );
  const durationSeconds: number[][] = Array.from({ length: n }, () =>
    new Array(n).fill(0)
  );

  if (n === 0) return { distanceMeters, durationSeconds };

  const plan = planMatrixRequests(n, n);

  for (const { originBlock, destinationBlock } of plan) {
    const origins = originBlock.indices.map((i) => points[i]);
    const destinations = destinationBlock.indices.map((i) => points[i]);

    const result = await client.getDistanceMatrix({ origins, destinations });

    originBlock.indices.forEach((origIdx, r) => {
      destinationBlock.indices.forEach((destIdx, c) => {
        const dist = result.distanceMeters[r]?.[c];
        const dur = result.durationSeconds[r]?.[c];

        if (dist == null || dur == null) {
          const fallbackDist = haversineDistanceMeters(
            points[origIdx],
            points[destIdx]
          );
          distanceMeters[origIdx][destIdx] = fallbackDist;
          durationSeconds[origIdx][destIdx] = estimateDurationSeconds(fallbackDist);
          if (origIdx !== destIdx) {
            console.warn(
              `[distanceMatrix] sem rota entre pontos ${origIdx} e ${destIdx}, usando haversine como fallback`
            );
          }
        } else {
          distanceMeters[origIdx][destIdx] = dist;
          durationSeconds[origIdx][destIdx] = dur;
        }
      });
    });
  }

  return { distanceMeters, durationSeconds };
}
