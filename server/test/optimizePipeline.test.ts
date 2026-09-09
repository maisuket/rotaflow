import { describe, expect, it } from "vitest";
import { runOptimization } from "../src/services/optimizePipeline";
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

describe("runOptimization — originMode firstPassenger", () => {
  it("escolhe a origem entre os proprios passageiros, ignorando o deposito cadastrado", async () => {
    // Deposito cadastrado fica bem longe de todos os passageiros — so serve de
    // referencia pra alocacao. Os passageiros ficam proximos entre si.
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
    const locations = [
      makeLocation("l1", 0, 0),
      makeLocation("l2", 0.01, 0),
      makeLocation("l3", 0.02, 0),
    ];

    const result = await runOptimization(locations, [route], makeFakeClient(), null);

    expect(result.routes).toHaveLength(1);
    const [routeResult] = result.routes;

    // A origem NAO pode ser o deposito cadastrado (-10,-10).
    expect(routeResult.depot.lat).not.toBeCloseTo(-10, 1);
    // A origem deve ser uma das proprias localizacoes.
    const originMatchesALocation = locations.some(
      (l) => Math.abs(l.lat - routeResult.depot.lat) < 1e-6 && Math.abs(l.lng - routeResult.depot.lng) < 1e-6
    );
    expect(originMatchesALocation).toBe(true);

    // Todas as 3 paradas devem aparecer, comecando pela origem escolhida.
    expect(routeResult.stops).toHaveLength(3);
    expect(routeResult.stops[0].lat).toBeCloseTo(routeResult.depot.lat, 6);
  });

  it("cai de volta pro deposito cadastrado quando a rota nao tem nenhum passageiro atribuido", async () => {
    const route: RouteVehicle = {
      ...ROUTE_DEFAULTS,
      id: "r1",
      name: "Rota A",
      depotLat: 5,
      depotLng: 5,
      capacity: 10,
      returnToDepot: true,
      originMode: "firstPassenger",
    };

    const result = await runOptimization([], [route], makeFakeClient(), null);

    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].depot).toEqual({ lat: 5, lng: 5 });
    expect(result.routes[0].stops).toHaveLength(0);
  });

  it("com destino global definido, a origem ainda e livre mas o final e sempre o destino", async () => {
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
    const locations = [makeLocation("l1", 0, 0), makeLocation("l2", 0.01, 0)];
    const destination = { name: "Fabrica", lat: 1, lng: 1 };

    const result = await runOptimization(locations, [route], makeFakeClient(), destination);

    expect(result.routes[0].destination).toEqual({ name: "Fabrica", lat: 1, lng: 1 });
  });
});

describe("runOptimization — lockedPositions", () => {
  it("trava uma parada como ultima da rota, mesmo nao sendo a ordem mais eficiente", async () => {
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
    // Alinhados numa linha: l1 mais perto do deposito, l3 mais longe.
    // Sem trava, a ordem otima visitaria l1 -> l2 -> l3. Travamos l1 (a mais
    // perto) como ULTIMA, forcando o tour a sacrificar eficiencia.
    const locations = [
      makeLocation("l1", 0.01, 0),
      makeLocation("l2", 0.02, 0),
      makeLocation("l3", 0.03, 0),
    ];
    const lockedPositions = new Map<string, "first" | "last">([["l1", "last"]]);

    const result = await runOptimization(
      locations,
      [route],
      makeFakeClient(),
      null,
      new Map(),
      null,
      lockedPositions
    );

    const stopIds = result.routes[0].stops.map((s) => s.locationId);
    expect(stopIds[stopIds.length - 1]).toBe("l1");
  });

  it("nao tem efeito quando a localizacao travada nao esta atribuida a nenhuma rota", async () => {
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
    const locations = [makeLocation("l1", 0.01, 0), makeLocation("l2", 0.02, 0)];
    const lockedPositions = new Map<string, "first" | "last">([["localizacao-inexistente", "last"]]);

    const result = await runOptimization(
      locations,
      [route],
      makeFakeClient(),
      null,
      new Map(),
      null,
      lockedPositions
    );

    expect(result.routes[0].stops).toHaveLength(2);
  });
});

describe("runOptimization — motorista/veiculo e speedFactor/costPerKm", () => {
  it("escala duracao/ETA por speedFactor, sem afetar a distancia", async () => {
    const baseRoute: RouteVehicle = {
      ...ROUTE_DEFAULTS,
      id: "r1",
      name: "Rota A",
      depotLat: 0,
      depotLng: 0,
      capacity: 10,
      returnToDepot: true,
      originMode: "depot",
    };
    const locations = [makeLocation("l1", 0.01, 0)];
    const departureSeconds = 8 * 3600;

    const normalResult = await runOptimization(
      locations,
      [baseRoute],
      makeFakeClient(),
      null,
      new Map(),
      departureSeconds
    );
    const slowRoute = { ...baseRoute, speedFactor: 2 };
    const slowResult = await runOptimization(
      locations,
      [slowRoute],
      makeFakeClient(),
      null,
      new Map(),
      departureSeconds
    );

    expect(slowResult.routes[0].totalDistanceMeters).toBeCloseTo(
      normalResult.routes[0].totalDistanceMeters,
      6
    );
    expect(slowResult.routes[0].totalDurationSeconds).toBeCloseTo(
      normalResult.routes[0].totalDurationSeconds * 2,
      6
    );
    expect(slowResult.routes[0].finalArrivalSeconds).toBe(
      departureSeconds + slowResult.routes[0].totalDurationSeconds
    );
  });

  it("calcula estimatedCost a partir de costPerKm, e o omite quando costPerKm e 0", async () => {
    const routeWithCost: RouteVehicle = {
      ...ROUTE_DEFAULTS,
      id: "r1",
      name: "Rota A",
      depotLat: 0,
      depotLng: 0,
      capacity: 10,
      returnToDepot: true,
      originMode: "depot",
      costPerKm: 2,
    };
    const locations = [makeLocation("l1", 0.01, 0)];

    const result = await runOptimization(locations, [routeWithCost], makeFakeClient(), null);
    const expectedCost = (result.routes[0].totalDistanceMeters / 1000) * 2;
    expect(result.routes[0].estimatedCost).toBeCloseTo(expectedCost, 6);

    const routeNoCost = { ...routeWithCost, costPerKm: 0 };
    const resultNoCost = await runOptimization(locations, [routeNoCost], makeFakeClient(), null);
    expect(resultNoCost.routes[0].estimatedCost).toBeUndefined();
  });

  it("propaga motorista/veiculo e capacidade pro resultado", async () => {
    const route: RouteVehicle = {
      ...ROUTE_DEFAULTS,
      id: "r1",
      name: "Rota A",
      depotLat: 0,
      depotLng: 0,
      capacity: 7,
      returnToDepot: true,
      originMode: "depot",
      driverName: "Joao",
      driverPhone: "92999990000",
      vehiclePlate: "ABC1D23",
      vehicleTypeLabel: "Van",
    };
    const locations = [makeLocation("l1", 0.01, 0)];

    const result = await runOptimization(locations, [route], makeFakeClient(), null);

    expect(result.routes[0].capacity).toBe(7);
    expect(result.routes[0].driverName).toBe("Joao");
    expect(result.routes[0].driverPhone).toBe("92999990000");
    expect(result.routes[0].vehiclePlate).toBe("ABC1D23");
    expect(result.routes[0].vehicleTypeLabel).toBe("Van");
  });
});
