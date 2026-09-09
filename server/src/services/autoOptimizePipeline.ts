import { buildDistanceMatrix } from "./distanceMatrix";
import { detectOutliers } from "./outliers";
import { sweepCluster } from "./clustering";
import { solveOpenTsp } from "./tsp";
import { computeArrivalByPointIndex } from "./routeCost";
import { fetchRouteDirections } from "./directions";
import { buildGoogleMapsLink } from "./mapsLink";
import {
  AutoOptimizeResponse,
  GlobalDestination,
  GoogleMapsClient,
  Location,
  OptimizedRouteResult,
  OutlierDecision,
} from "../types";

/**
 * Modo automatico: em vez de rotas pre-cadastradas com deposito fixo, recebe
 * so as localizacoes + uma capacidade por veiculo, e decide sozinho:
 * 1. Quais localizacoes sao "outliers" (muito longe das demais) — essas ficam
 *    pendentes ate o usuario decidir (`outlierDecisions`) se querem uma rota
 *    exclusiva so pra elas ou ficar de fora por enquanto.
 * 2. Quantas rotas sao necessarias para o resto (agrupamento por varredura
 *    angular respeitando a capacidade).
 * 3. Para cada grupo, a ordem de visita E o ponto de origem (livre — sai de
 *    qualquer um dos proprios passageiros, o que for mais eficiente).
 *
 * `lockedPositions` (locationId -> "first" | "last") trava uma parada como
 * primeira ou ultima do trajeto dentro do grupo em que ela acabar caindo.
 */
export async function runAutoOptimization(
  locations: Location[],
  capacityPerVehicle: number,
  destination: GlobalDestination | null,
  outlierDecisions: Record<string, OutlierDecision>,
  client: GoogleMapsClient,
  departureSeconds: number | null = null,
  lockedPositions: Map<string, "first" | "last"> = new Map()
): Promise<AutoOptimizeResponse> {
  if (locations.length === 0) {
    return { routes: [], unassignedLocationIds: [], pendingOutliers: [], generatedAt: new Date().toISOString() };
  }

  const points = [
    ...locations.map((l) => ({ lat: l.lat, lng: l.lng })),
    ...(destination ? [{ lat: destination.lat, lng: destination.lng }] : []),
  ];
  const indexOf = new Map<string, number>();
  const idAtIndex = new Map<number, string>();
  locations.forEach((l, i) => {
    indexOf.set(l.id, i);
    idAtIndex.set(i, l.id);
  });
  const destinationIdx = destination ? locations.length : null;

  const matrix = await buildDistanceMatrix(points, client);
  const locationById = new Map(locations.map((l) => [l.id, l]));

  const outlierCandidates = detectOutliers(
    locations.map((l) => l.id),
    matrix.distanceMeters,
    indexOf
  );

  const pendingOutliers: AutoOptimizeResponse["pendingOutliers"] = [];
  const dedicatedIds = new Set<string>();
  const excludedIds = new Set<string>();

  for (const candidate of outlierCandidates) {
    const decision = outlierDecisions[candidate.locationId];
    if (decision === "dedicated") {
      dedicatedIds.add(candidate.locationId);
    } else if (decision === "exclude") {
      excludedIds.add(candidate.locationId);
    } else {
      pendingOutliers.push({
        locationId: candidate.locationId,
        name: locationById.get(candidate.locationId)!.name,
        nearestDistanceMeters: candidate.nearestDistanceMeters,
        nearestLocationName: locationById.get(candidate.nearestLocationId)?.name ?? "?",
      });
    }
  }

  const pendingIds = new Set(pendingOutliers.map((p) => p.locationId));
  const normalLocations = locations.filter(
    (l) => !dedicatedIds.has(l.id) && !excludedIds.has(l.id) && !pendingIds.has(l.id)
  );

  const clusters = sweepCluster(
    normalLocations.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, demand: l.demand })),
    capacityPerVehicle
  );
  for (const id of dedicatedIds) {
    clusters.push({ locationIds: [id] });
  }

  const routeResults: OptimizedRouteResult[] = [];
  let routeCounter = 0;

  for (const cluster of clusters) {
    routeCounter++;
    const pointIndices = cluster.locationIds.map((id) => indexOf.get(id)!);
    const isDedicated = cluster.locationIds.length === 1 && dedicatedIds.has(cluster.locationIds[0]);

    let lockedFirstIdx: number | null = null;
    let lockedLastIdx: number | null = null;
    for (const locationId of cluster.locationIds) {
      const lock = lockedPositions.get(locationId);
      if (lock === "first" && lockedFirstIdx === null) {
        lockedFirstIdx = indexOf.get(locationId)!;
      } else if (lock === "last" && lockedLastIdx === null) {
        lockedLastIdx = indexOf.get(locationId)!;
      }
    }

    const tsp = solveOpenTsp(
      pointIndices,
      matrix.distanceMeters,
      matrix.durationSeconds,
      destinationIdx,
      lockedFirstIdx,
      lockedLastIdx
    );

    const orderedLocIndices = tsp.order.filter((idx) => idx !== destinationIdx);
    const orderedStops = orderedLocIndices.map((idx) => locationById.get(idAtIndex.get(idx)!)!);
    const originStop = orderedStops[0];
    const remainingStops = orderedStops.slice(1);

    const arrivalByIndex =
      departureSeconds !== null
        ? computeArrivalByPointIndex(tsp.order, matrix.durationSeconds, departureSeconds)
        : null;

    const endPoint = destination ? { lat: destination.lat, lng: destination.lng } : null;
    const originPoint = { lat: originStop.lat, lng: originStop.lng };
    const remainingStopPoints = remainingStops.map((s) => ({ lat: s.lat, lng: s.lng }));

    const directions = await fetchRouteDirections(originPoint, remainingStopPoints, endPoint, client);
    const mapsUrl = buildGoogleMapsLink(originPoint, remainingStopPoints, endPoint);

    routeResults.push({
      routeId: `auto-${routeCounter}-${originStop.id}`,
      routeName: isDedicated ? `Rota exclusiva — ${originStop.name}` : `Rota automática ${routeCounter}`,
      depot: originPoint,
      destination: destination
        ? { lat: destination.lat, lng: destination.lng, name: destination.name }
        : null,
      stops: orderedStops.map((s, i) => ({
        locationId: s.id,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        demand: s.demand,
        etaSeconds: arrivalByIndex?.get(orderedLocIndices[i]),
      })),
      totalDistanceMeters: tsp.totalDistanceMeters,
      totalDurationSeconds: tsp.totalDurationSeconds,
      directions,
      finalArrivalSeconds:
        departureSeconds !== null ? departureSeconds + tsp.totalDurationSeconds : undefined,
      mapsUrl,
      capacity: capacityPerVehicle,
    });
  }

  return {
    routes: routeResults,
    unassignedLocationIds: [...excludedIds],
    pendingOutliers,
    generatedAt: new Date().toISOString(),
  };
}
