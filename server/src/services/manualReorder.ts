import { buildDistanceMatrix } from "./distanceMatrix";
import { computeFixedOrderTour } from "./tsp";
import { computeArrivalByPointIndex } from "./routeCost";
import { fetchRouteDirections } from "./directions";
import { buildGoogleMapsLink } from "./mapsLink";
import {
  GlobalDestination,
  GoogleMapsClient,
  Location,
  OptimizedRouteResult,
  RouteVehicle,
} from "../types";

/**
 * Recalcula o resultado de UMA rota para uma ordem de paradas escolhida
 * manualmente pelo usuario (ex: motorista pediu pra trocar 2 paradas de
 * lugar), em vez de deixar o TSP decidir. Usa a MESMA regra de origem/destino
 * do pipeline principal (`optimizePipeline.ts`/`autoOptimizePipeline.ts`):
 * `route.originMode === "firstPassenger"` trata `orderedLocations[0]` como a
 * propria origem (sem deposito fixo); caso contrario comeca no deposito
 * cadastrado em `route`.
 *
 * Monta uma mini matriz de distancias so com os pontos dessa rota (nao a
 * global do pipeline) — e uma chamada extra ao Google, mas reordenar e uma
 * acao pontual e rara o suficiente pra nao valer a pena replicar o estado da
 * ultima otimizacao completa so pra isso.
 */
export async function computeManualOrderResult(
  route: RouteVehicle,
  orderedLocations: Location[],
  destination: GlobalDestination | null,
  departureSeconds: number | null,
  client: GoogleMapsClient
): Promise<OptimizedRouteResult> {
  const usesFirstPassengerOrigin =
    route.originMode === "firstPassenger" && orderedLocations.length > 0;

  const originPoint = usesFirstPassengerOrigin
    ? { lat: orderedLocations[0].lat, lng: orderedLocations[0].lng }
    : { lat: route.depotLat, lng: route.depotLng };

  const endPoint = destination
    ? { lat: destination.lat, lng: destination.lng }
    : usesFirstPassengerOrigin
      ? null
      : route.returnToDepot
        ? { lat: route.depotLat, lng: route.depotLng }
        : null;

  // Em modo "firstPassenger" a primeira posicao JA e a origem (nao aparece
  // de novo como waypoint); nos demais casos, todas as paradas sao waypoints.
  const stopsForMatrix = usesFirstPassengerOrigin
    ? orderedLocations.slice(1)
    : orderedLocations;

  const points = [
    originPoint,
    ...stopsForMatrix.map((l) => ({ lat: l.lat, lng: l.lng })),
    ...(endPoint ? [endPoint] : []),
  ];

  const matrix = await buildDistanceMatrix(points, client);
  const order = points.map((_, i) => i);
  const tour = computeFixedOrderTour(order, matrix.distanceMeters, matrix.durationSeconds);

  const arrivalByIndex =
    departureSeconds !== null
      ? computeArrivalByPointIndex(order, matrix.durationSeconds, departureSeconds, route.speedFactor)
      : null;
  const scaledDurationSeconds = tour.totalDurationSeconds * route.speedFactor;

  // orderedLocations[i] cai no indice i (modo firstPassenger, origem = orderedLocations[0])
  // ou i+1 (modo deposito, ponto 0 da matriz e o deposito, nao uma parada).
  const matrixIndexForStop = (i: number) => (usesFirstPassengerOrigin ? i : i + 1);

  const directionsStopPoints = stopsForMatrix.map((s) => ({ lat: s.lat, lng: s.lng }));
  const directions = await fetchRouteDirections(originPoint, directionsStopPoints, endPoint, client);
  const mapsUrl = buildGoogleMapsLink(originPoint, directionsStopPoints, endPoint);

  return {
    routeId: route.id,
    routeName: route.name,
    depot: originPoint,
    destination: destination
      ? { lat: destination.lat, lng: destination.lng, name: destination.name }
      : endPoint,
    stops: orderedLocations.map((s, i) => ({
      locationId: s.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      demand: s.demand,
      etaSeconds: arrivalByIndex?.get(matrixIndexForStop(i)),
    })),
    totalDistanceMeters: tour.totalDistanceMeters,
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
      route.costPerKm > 0 ? (tour.totalDistanceMeters / 1000) * route.costPerKm : undefined,
  };
}
