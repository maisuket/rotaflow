import { DirectionsInfo, GoogleMapsClient } from "../types";
import { GoogleApiError } from "./googleMapsClient";

export interface DirectionsPoint {
  lat: number;
  lng: number;
}

/**
 * Busca o trajeto real (ruas de verdade) para uma rota, com a ordem de
 * paradas ja decidida pelo TSP. Usa waypoints na ordem fixa — NAO deixa o
 * Google reotimizar, para nao dessincronizar do resultado do assignment/tsp.
 *
 * `endPoint` e o ponto final real da rota (o proprio deposito quando retorna,
 * ou um destino global compartilhado). Quando null, a rota termina aberta na
 * ultima parada.
 *
 * `orderedStops` pode vir vazio quando ha um `endPoint` distinto da origem —
 * caso de uma rota exclusiva (1 passageiro) que so precisa ir direto ate o
 * destino compartilhado, sem paradas intermediarias.
 *
 * Uma falha aqui (ZERO_RESULTS, quota, etc.) nao deve derrubar o pipeline
 * inteiro: retorna `available: false` com a mensagem de erro, e o chamador
 * mantem os totais estimados pela matriz como fallback.
 */
export async function fetchRouteDirections(
  origin: DirectionsPoint,
  orderedStops: DirectionsPoint[],
  endPoint: DirectionsPoint | null,
  client: GoogleMapsClient
): Promise<DirectionsInfo> {
  const hasRealEndpoint =
    endPoint && (endPoint.lat !== origin.lat || endPoint.lng !== origin.lng);
  if (orderedStops.length === 0 && !hasRealEndpoint) {
    return { available: false, error: "Rota sem paradas atribuidas" };
  }

  const destination = endPoint ?? orderedStops[orderedStops.length - 1];
  const waypoints = endPoint ? orderedStops : orderedStops.slice(0, -1);

  try {
    const result = await client.getDirections({
      origin,
      destination,
      waypoints,
    });
    return {
      available: true,
      encodedPolyline: result.encodedPolyline,
      legs: result.legs,
    };
  } catch (err) {
    const message =
      err instanceof GoogleApiError ? err.message : "Erro desconhecido ao buscar direcoes";
    return { available: false, error: message };
  }
}
