import { AssignmentResult, Location, RouteVehicle } from "../types";

/**
 * Aloca localizacoes as rotas respeitando capacidade, usando uma heuristica
 * gulosa "nearest-feasible-depot":
 *
 * 1. Para cada localizacao, calcula a distancia a cada deposito de rota.
 * 2. Processa as localizacoes globalmente ordenadas pela sua MENOR distancia
 *    a qualquer deposito (as mais "obviamente" proximas de alguma rota primeiro),
 *    para evitar que uma localizacao distante roube a ultima vaga de uma rota
 *    que serve um cluster mais proximo.
 * 3. Para cada localizacao, tenta a rota mais proxima primeiro; se a capacidade
 *    restante nao comportar a demanda, tenta a proxima mais proxima, e assim por diante.
 * 4. Localizacoes que nao cabem em nenhuma rota (capacidade global insuficiente,
 *    ou demand > capacity de todas as rotas) sao explicitamente marcadas como
 *    `unassigned`, nunca descartadas silenciosamente.
 *
 * `pointIndexOf` mapeia um id (deposito ou localizacao) para seu indice na
 * matriz de distancias compartilhada [...depots, ...locations].
 *
 * `forcedAssignments` (locationId -> routeId) manda direto uma localizacao pra
 * rota escolhida pelo usuario, ignorando a heuristica de proximidade e a
 * capacidade (util para "forcar" alguem que ficou sem rota). A demanda dela
 * ainda desconta da capacidade restante da rota, entao pode deixar a rota
 * "estourada" — isso e intencional, o usuario decidiu explicitamente.
 */
export function assignLocationsToRoutes(
  locations: Location[],
  routes: RouteVehicle[],
  distanceMeters: number[][],
  pointIndexOf: Map<string, number>,
  forcedAssignments: Map<string, string> = new Map()
): AssignmentResult {
  if (routes.length === 0) {
    return {
      assignments: [],
      unassignedLocationIds: locations.map((l) => l.id),
    };
  }

  const routeIds = new Set(routes.map((r) => r.id));
  const remainingCapacity = new Map<string, number>(
    routes.map((r) => [r.id, r.capacity])
  );
  const assignedIds = new Map<string, string[]>(routes.map((r) => [r.id, []]));

  const forcedLocationIds = new Set<string>();
  for (const location of locations) {
    const forcedRouteId = forcedAssignments.get(location.id);
    if (forcedRouteId && routeIds.has(forcedRouteId)) {
      assignedIds.get(forcedRouteId)!.push(location.id);
      remainingCapacity.set(forcedRouteId, remainingCapacity.get(forcedRouteId)! - location.demand);
      forcedLocationIds.add(location.id);
    }
  }

  const remainingLocations = locations.filter((l) => !forcedLocationIds.has(l.id));

  const withPreferences = remainingLocations.map((location) => {
    const locIdx = pointIndexOf.get(location.id)!;
    const preferences = routes
      .map((route) => {
        const depotIdx = pointIndexOf.get(route.id)!;
        return { route, dist: distanceMeters[depotIdx][locIdx] };
      })
      .sort((a, b) => a.dist - b.dist);
    return { location, preferences, nearestDist: preferences[0].dist };
  });

  withPreferences.sort((a, b) => a.nearestDist - b.nearestDist);

  const unassignedLocationIds: string[] = [];

  for (const { location, preferences } of withPreferences) {
    let placed = false;
    for (const { route } of preferences) {
      const remaining = remainingCapacity.get(route.id)!;
      if (remaining >= location.demand) {
        remainingCapacity.set(route.id, remaining - location.demand);
        assignedIds.get(route.id)!.push(location.id);
        placed = true;
        break;
      }
    }
    if (!placed) {
      unassignedLocationIds.push(location.id);
    }
  }

  return {
    assignments: routes.map((r) => ({
      routeId: r.id,
      locationIds: assignedIds.get(r.id)!,
    })),
    unassignedLocationIds,
  };
}
