import { buildDistanceMatrix } from "./distanceMatrix";
import { assignLocationsToRoutes } from "./assignment";
import { computeArrivalByPointIndex, computeRouteTsp } from "./routeCost";
import { improveAssignmentsAcrossRoutes } from "./interRouteOptimizer";
import { fetchRouteDirections } from "./directions";
import { buildGoogleMapsLink } from "./mapsLink";
import {
  GlobalDestination,
  GoogleMapsClient,
  Location,
  OptimizeResponse,
  OptimizedRouteResult,
  RouteVehicle,
} from "../types";

const DESTINATION_KEY = "__global_destination__";

/**
 * Orquestra o pipeline completo: matriz de distancias -> alocacao por
 * capacidade -> melhoria entre rotas (relocate/swap) -> ordenacao (TSP) por
 * rota -> trajeto real (Directions) -> ETA por parada (se houver horario de
 * partida).
 *
 * Se `destination` for fornecido, TODAS as rotas passam a terminar nesse
 * ponto compartilhado (em vez de voltar para o proprio deposito) — o
 * `returnToDepot` de cada rota so importa quando nao ha destino global.
 *
 * Rotas com `originMode: "firstPassenger"` usam o depositoLat/Lng SO como
 * referencia geografica na fase de alocacao (decidir quais passageiros
 * pertencem a rota) — o trajeto de fato comeca em qualquer um dos passageiros
 * ja atribuidos, o que a otimizacao (TSP de caminho aberto, sem ponto de
 * partida fixo) decidir ser o melhor. Nesse modo, `returnToDepot` e ignorado
 * (nao ha deposito real na ponta do trajeto).
 *
 * `forcedAssignments` (locationId -> routeId) forca uma localizacao (ex: uma
 * que ficou sem rota numa otimizacao anterior) pra uma rota especifica,
 * ignorando a heuristica de proximidade/capacidade — ver `assignLocationsToRoutes`.
 * Essas localizacoes tambem ficam protegidas da melhoria entre rotas (nunca
 * sao realocadas de volta pra outra rota automaticamente).
 *
 * `departureSeconds` (segundos desde a meia-noite) e opcional — quando
 * fornecido, cada parada e o ponto final de cada rota ganham uma estimativa
 * de chegada (`etaSeconds`/`finalArrivalSeconds`).
 *
 * `lockedPositions` (locationId -> "first" | "last") trava uma parada
 * especifica como primeira ou ultima do trajeto DENTRO da rota pra qual ela
 * for atribuida — ex: "essa pessoa tem que ser a ultima, ela sai depois do
 * trabalho". So tem efeito se a localizacao realmente acabar nessa rota.
 */
export async function runOptimization(
  locations: Location[],
  routes: RouteVehicle[],
  client: GoogleMapsClient,
  destination: GlobalDestination | null = null,
  forcedAssignments: Map<string, string> = new Map(),
  departureSeconds: number | null = null,
  lockedPositions: Map<string, "first" | "last"> = new Map()
): Promise<OptimizeResponse> {
  // Pontos indexados como [...depositos das rotas, ...localizacoes, destino global?].
  const points = [
    ...routes.map((r) => ({ lat: r.depotLat, lng: r.depotLng })),
    ...locations.map((l) => ({ lat: l.lat, lng: l.lng })),
    ...(destination ? [{ lat: destination.lat, lng: destination.lng }] : []),
  ];

  const pointIndexOf = new Map<string, number>();
  const idAtIndex = new Map<number, string>();
  routes.forEach((r, i) => {
    pointIndexOf.set(r.id, i);
    idAtIndex.set(i, r.id);
  });
  locations.forEach((l, i) => {
    pointIndexOf.set(l.id, routes.length + i);
    idAtIndex.set(routes.length + i, l.id);
  });
  const destinationIdx = destination ? routes.length + locations.length : null;
  if (destinationIdx !== null) pointIndexOf.set(DESTINATION_KEY, destinationIdx);

  const matrix = await buildDistanceMatrix(points, client);

  const { assignments: initialAssignments, unassignedLocationIds } = assignLocationsToRoutes(
    locations,
    routes,
    matrix.distanceMeters,
    pointIndexOf,
    forcedAssignments
  );

  const locationById = new Map(locations.map((l) => [l.id, l]));

  const assignments = improveAssignmentsAcrossRoutes(
    routes,
    initialAssignments,
    locationById,
    pointIndexOf,
    matrix.distanceMeters,
    matrix.durationSeconds,
    destinationIdx,
    new Set(forcedAssignments.keys())
  );

  const routeResults: OptimizedRouteResult[] = await Promise.all(
    assignments.map(async (assignment) => {
      const route = routes.find((r) => r.id === assignment.routeId)!;
      const depotIdx = pointIndexOf.get(route.id)!;
      const stopIndices = assignment.locationIds.map(
        (id) => pointIndexOf.get(id)!
      );

      const usesFirstPassengerOrigin =
        route.originMode === "firstPassenger" && stopIndices.length > 0;

      let lockedFirstIdx: number | null = null;
      let lockedLastIdx: number | null = null;
      for (const locationId of assignment.locationIds) {
        const lock = lockedPositions.get(locationId);
        if (lock === "first" && lockedFirstIdx === null) {
          lockedFirstIdx = pointIndexOf.get(locationId)!;
        } else if (lock === "last" && lockedLastIdx === null) {
          lockedLastIdx = pointIndexOf.get(locationId)!;
        }
      }

      const tsp = computeRouteTsp(
        route,
        stopIndices,
        depotIdx,
        destinationIdx,
        matrix.distanceMeters,
        matrix.durationSeconds,
        lockedFirstIdx,
        lockedLastIdx
      );

      // Remove deposito e destino global das pontas do tour para sobrar so as paradas.
      const orderedLocationIndices = tsp.order.filter(
        (idx) => idx !== depotIdx && idx !== destinationIdx
      );
      const orderedStops = orderedLocationIndices.map(
        (idx) => locationById.get(idAtIndex.get(idx)!)!
      );

      const arrivalByIndex =
        departureSeconds !== null
          ? computeArrivalByPointIndex(
              tsp.order,
              matrix.durationSeconds,
              departureSeconds,
              route.speedFactor
            )
          : null;
      const scaledDurationSeconds = tsp.totalDurationSeconds * route.speedFactor;

      // Ponto de origem real do trajeto: o proprio deposito, ou o passageiro
      // escolhido pela otimizacao como melhor ponto de partida.
      const originPoint =
        usesFirstPassengerOrigin && orderedStops.length > 0
          ? { lat: orderedStops[0].lat, lng: orderedStops[0].lng }
          : { lat: route.depotLat, lng: route.depotLng };

      const endPoint = destination
        ? { lat: destination.lat, lng: destination.lng }
        : usesFirstPassengerOrigin
          ? null
          : route.returnToDepot
            ? { lat: route.depotLat, lng: route.depotLng }
            : null;

      // Em modo "firstPassenger" o primeiro stop JA e a origem (nao um waypoint separado).
      const directionsStops = usesFirstPassengerOrigin ? orderedStops.slice(1) : orderedStops;

      const directionsStopPoints = directionsStops.map((s) => ({ lat: s.lat, lng: s.lng }));

      const directions = await fetchRouteDirections(originPoint, directionsStopPoints, endPoint, client);
      const mapsUrl = buildGoogleMapsLink(originPoint, directionsStopPoints, endPoint);

      return {
        routeId: route.id,
        routeName: route.name,
        depot: originPoint,
        destination: destination
          ? { lat: destination.lat, lng: destination.lng, name: destination.name }
          : endPoint,
        stops: orderedStops.map((s, i) => ({
          locationId: s.id,
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          demand: s.demand,
          etaSeconds: arrivalByIndex?.get(orderedLocationIndices[i]),
        })),
        totalDistanceMeters: tsp.totalDistanceMeters,
        totalDurationSeconds: scaledDurationSeconds,
        directions,
        finalArrivalSeconds:
          departureSeconds !== null ? departureSeconds + scaledDurationSeconds : undefined,
        mapsUrl,
        capacity: route.capacity,
        driverName: route.driverName,
        driverPhone: route.driverPhone,
        vehiclePlate: route.vehiclePlate,
        vehicleTypeLabel: route.vehicleTypeLabel,
        estimatedCost:
          route.costPerKm > 0 ? (tsp.totalDistanceMeters / 1000) * route.costPerKm : undefined,
      };
    })
  );

  return {
    routes: routeResults,
    unassignedLocationIds,
    generatedAt: new Date().toISOString(),
    // Preenchido pelo handler HTTP (`optimize.routes.ts`), que sabe quais rotas
    // existem mas ficaram de fora por causa da recorrencia semanal.
    inactiveRouteIds: [],
  };
}
