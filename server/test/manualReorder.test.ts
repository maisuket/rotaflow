import { describe, expect, it } from "vitest";
import { computeManualOrderResult } from "../src/services/manualReorder";
import { GoogleMapsClient, Location, RouteVehicle } from "../src/types";
import { haversineDistanceMeters } from "../src/utils/geo";

function makeFakeClient(): GoogleMapsClient {
  return {
    async getDistanceMatrix({ origins, destinations }) {
      return {
        distanceMeters: origins.map((o) => destinations.map((d) => haversineDistanceMeters(o, d))),
        durationSeconds: origins.map((o) =>
          destinations.map((d) => haversineDistanceMeters(o, d) / 10)
        ),
      };
    },
    async getDirections({ origin, waypoints, destination }) {
      return {
        encodedPolyline: "fake",
        legs: [origin, ...waypoints, destination].slice(1).map(() => ({
          distanceMeters: 1000,
          durationSeconds: 100,
        })),
      };
    },
    async geocodeAddress() {
      throw new Error("nao usado neste teste");
    },
  };
}

function makeLocation(id: string, lat: number, lng: number, demand = 1): Location {
  return { id, name: id, lat, lng, demand };
}

const ROUTE_DEFAULTS = {
  driverName: null,
  driverPhone: null,
  vehiclePlate: null,
  vehicleTypeLabel: null,
  speedFactor: 1,
  costPerKm: 0,
  activeWeekdays: null,
} as const;

describe("computeManualOrderResult", () => {
  it("respeita literalmente a ordem dada (modo deposito), sem tentar otimizar", async () => {
    const route: RouteVehicle = {
      ...ROUTE_DEFAULTS,
      id: "r1",
      name: "Rota A",
      depotLat: 0,
      depotLng: 0,
      capacity: 10,
      returnToDepot: true,
      originMode: "depot",
    };
    // Ordem propositalmente ruim (longe -> perto -> meio), o TSP nunca escolheria isso.
    const orderedLocations = [
      makeLocation("far", 0.03, 0),
      makeLocation("near", 0.01, 0),
      makeLocation("mid", 0.02, 0),
    ];

    const result = await computeManualOrderResult(route, orderedLocations, null, null, makeFakeClient());

    expect(result.stops.map((s) => s.locationId)).toEqual(["far", "near", "mid"]);
    expect(result.depot).toEqual({ lat: 0, lng: 0 });
    // Deposito -> far -> near -> mid -> deposito (returnToDepot): soma das pernas literais.
    const expectedDistance =
      haversineDistanceMeters({ lat: 0, lng: 0 }, { lat: 0.03, lng: 0 }) +
      haversineDistanceMeters({ lat: 0.03, lng: 0 }, { lat: 0.01, lng: 0 }) +
      haversineDistanceMeters({ lat: 0.01, lng: 0 }, { lat: 0.02, lng: 0 }) +
      haversineDistanceMeters({ lat: 0.02, lng: 0 }, { lat: 0, lng: 0 });
    expect(result.totalDistanceMeters).toBeCloseTo(expectedDistance, 6);
  });

  it("modo firstPassenger: a primeira posicao da lista vira a propria origem", async () => {
    const route: RouteVehicle = {
      ...ROUTE_DEFAULTS,
      id: "r1",
      name: "Rota A",
      depotLat: -10,
      depotLng: -10,
      capacity: 10,
      returnToDepot: true,
      originMode: "firstPassenger",
    };
    const orderedLocations = [
      makeLocation("origin-choice", 0, 0),
      makeLocation("second", 0.01, 0),
    ];

    const result = await computeManualOrderResult(route, orderedLocations, null, null, makeFakeClient());

    expect(result.depot).toEqual({ lat: 0, lng: 0 });
    expect(result.stops).toHaveLength(2);
    expect(result.stops[0].locationId).toBe("origin-choice");
    expect(result.stops[1].locationId).toBe("second");
  });

  it("calcula ETA por parada consistente com a ordem manual quando ha horario de partida", async () => {
    const route: RouteVehicle = {
      ...ROUTE_DEFAULTS,
      id: "r1",
      name: "Rota A",
      depotLat: 0,
      depotLng: 0,
      capacity: 10,
      returnToDepot: false,
      originMode: "depot",
    };
    const orderedLocations = [makeLocation("a", 0.01, 0), makeLocation("b", 0.02, 0)];
    const departureSeconds = 8 * 3600; // 08:00

    const result = await computeManualOrderResult(
      route,
      orderedLocations,
      null,
      departureSeconds,
      makeFakeClient()
    );

    expect(result.stops[0].etaSeconds).toBeGreaterThan(departureSeconds);
    expect(result.stops[1].etaSeconds).toBeGreaterThan(result.stops[0].etaSeconds!);
    expect(result.finalArrivalSeconds).toBe(departureSeconds + result.totalDurationSeconds);
  });

  it("com destino global, a rota sempre termina la (mesmo sem returnToDepot)", async () => {
    const route: RouteVehicle = {
      ...ROUTE_DEFAULTS,
      id: "r1",
      name: "Rota A",
      depotLat: 0,
      depotLng: 0,
      capacity: 10,
      returnToDepot: false,
      originMode: "depot",
    };
    const orderedLocations = [makeLocation("a", 0.01, 0)];
    const destination = { name: "Fabrica", lat: 1, lng: 1 };

    const result = await computeManualOrderResult(route, orderedLocations, destination, null, makeFakeClient());

    expect(result.destination).toEqual({ name: "Fabrica", lat: 1, lng: 1 });
  });

  it("escala totalDurationSeconds/finalArrivalSeconds por speedFactor e calcula estimatedCost", async () => {
    const route: RouteVehicle = {
      ...ROUTE_DEFAULTS,
      id: "r1",
      name: "Rota A",
      depotLat: 0,
      depotLng: 0,
      capacity: 10,
      returnToDepot: true,
      originMode: "depot",
      speedFactor: 2,
      costPerKm: 3,
      driverName: "Joao",
      vehiclePlate: "ABC1D23",
    };
    const orderedLocations = [makeLocation("a", 0.01, 0)];
    const departureSeconds = 8 * 3600;

    const normalRoute = { ...route, speedFactor: 1 };
    const normalResult = await computeManualOrderResult(
      normalRoute,
      orderedLocations,
      null,
      departureSeconds,
      makeFakeClient()
    );
    const result = await computeManualOrderResult(
      route,
      orderedLocations,
      null,
      departureSeconds,
      makeFakeClient()
    );

    expect(result.totalDurationSeconds).toBeCloseTo(normalResult.totalDurationSeconds * 2, 6);
    expect(result.finalArrivalSeconds).toBe(departureSeconds + result.totalDurationSeconds);
    expect(result.estimatedCost).toBeCloseTo((result.totalDistanceMeters / 1000) * 3, 6);
    expect(result.driverName).toBe("Joao");
    expect(result.vehiclePlate).toBe("ABC1D23");
    expect(result.capacity).toBe(10);
  });
});
