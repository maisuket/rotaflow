export interface ClusterInput {
  id: string;
  lat: number;
  lng: number;
  demand: number;
}

export interface Cluster {
  locationIds: string[];
}

/**
 * Agrupa localizacoes em clusters respeitando uma capacidade maxima por
 * cluster, usando o algoritmo de "varredura angular" (sweep): calcula o
 * centroide do grupo, ordena as localizacoes pelo angulo em relacao a ele, e
 * vai preenchendo clusters em sequencia angular ate estourar a capacidade.
 *
 * Produz clusters geograficamente compactos (fatias de "pizza" ao redor do
 * centroide) sem precisar decidir o numero de rotas de antemao — o numero de
 * clusters sai naturalmente de quantos couberem respeitando a capacidade.
 */
export function sweepCluster(
  locations: ClusterInput[],
  capacityPerVehicle: number
): Cluster[] {
  if (locations.length === 0) return [];

  const centroid = {
    lat: locations.reduce((sum, l) => sum + l.lat, 0) / locations.length,
    lng: locations.reduce((sum, l) => sum + l.lng, 0) / locations.length,
  };

  const withAngle = locations.map((l) => ({
    ...l,
    angle: Math.atan2(l.lat - centroid.lat, l.lng - centroid.lng),
  }));
  withAngle.sort((a, b) => a.angle - b.angle);

  const clusters: Cluster[] = [];
  let current: string[] = [];
  let currentDemand = 0;

  for (const loc of withAngle) {
    if (current.length > 0 && currentDemand + loc.demand > capacityPerVehicle) {
      clusters.push({ locationIds: current });
      current = [];
      currentDemand = 0;
    }
    current.push(loc.id);
    currentDemand += loc.demand;
  }
  if (current.length > 0) clusters.push({ locationIds: current });

  return clusters;
}
