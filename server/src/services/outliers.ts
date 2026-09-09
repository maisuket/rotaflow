export interface OutlierCandidate {
  locationId: string;
  nearestDistanceMeters: number;
  nearestLocationId: string;
}

const OUTLIER_MULTIPLIER = 3;
const MIN_ABSOLUTE_METERS = 3000;
/** Com poucas localizacoes, "mediana" e "3x a mediana" nao dizem muita coisa — pula a deteccao. */
const MIN_SAMPLE_SIZE = 4;

/**
 * Sinaliza localizacoes cuja distancia ate a mais proxima e desproporcional
 * ao resto do grupo (ex: um passageiro isolado longe de todos os outros).
 * Usa a mediana das distancias-ao-vizinho-mais-proximo como referencia, para
 * nao ser enganado por um unico outlier extremo distorcendo uma media.
 *
 * So marca como candidato quando a distancia for > `OUTLIER_MULTIPLIER`x a
 * mediana E > `MIN_ABSOLUTE_METERS` (evita falso positivo em grupos onde
 * todo mundo ja esta naturalmente espalhado).
 */
export function detectOutliers(
  locationIds: string[],
  distanceMeters: number[][],
  indexOf: Map<string, number>
): OutlierCandidate[] {
  if (locationIds.length < MIN_SAMPLE_SIZE) return [];

  const nearest = locationIds.map((id) => {
    const idx = indexOf.get(id)!;
    let bestDist = Infinity;
    let bestId = "";
    for (const otherId of locationIds) {
      if (otherId === id) continue;
      const otherIdx = indexOf.get(otherId)!;
      const d = distanceMeters[idx][otherIdx];
      if (d < bestDist) {
        bestDist = d;
        bestId = otherId;
      }
    }
    return { locationId: id, nearestDistanceMeters: bestDist, nearestLocationId: bestId };
  });

  const sortedDistances = nearest.map((n) => n.nearestDistanceMeters).sort((a, b) => a - b);
  const median = sortedDistances[Math.floor(sortedDistances.length / 2)];

  return nearest.filter(
    (n) =>
      n.nearestDistanceMeters > median * OUTLIER_MULTIPLIER &&
      n.nearestDistanceMeters > MIN_ABSOLUTE_METERS
  );
}
