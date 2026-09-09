import { describe, expect, it } from "vitest";
import { improveAssignmentsAcrossRoutes } from "../src/services/interRouteOptimizer";
import { Location, RouteAssignmentResult, RouteVehicle } from "../src/types";

function makeRoute(id: string, capacity: number): RouteVehicle {
  return {
    id,
    name: id,
    depotLat: 0,
    depotLng: 0,
    capacity,
    returnToDepot: true,
    originMode: "depot",
    driverName: null,
    driverPhone: null,
    vehiclePlate: null,
    vehicleTypeLabel: null,
    speedFactor: 1,
    costPerKm: 0,
    activeWeekdays: null,
  };
}
function makeLocation(id: string, demand = 1): Location {
  return { id, name: id, lat: 0, lng: 0, demand };
}

// Todos os pontos numa linha: A=0, B=100, L1=1, L2=2, L3=98, L4=99.
// L1/L2 sao vizinhos de A; L3/L4 sao vizinhos de B.
function buildLineMatrix() {
  const positions = { A: 0, B: 100, L1: 1, L2: 2, L3: 98, L4: 99 };
  const order = ["A", "B", "L1", "L2", "L3", "L4"] as const;
  const indexOf = new Map(order.map((id, i) => [id, i]));
  const distanceMeters = order.map((a) => order.map((b) => Math.abs(positions[a] - positions[b])));
  return { indexOf, distanceMeters, durationSeconds: distanceMeters };
}

describe("improveAssignmentsAcrossRoutes", () => {
  it("desfaz um cruzamento ruim via swap, reduzindo bastante a distancia total", () => {
    const { indexOf, distanceMeters, durationSeconds } = buildLineMatrix();

    const routeA = makeRoute("A", 2);
    const routeB = makeRoute("B", 2);
    const locations = [makeLocation("L1"), makeLocation("L2"), makeLocation("L3"), makeLocation("L4")];
    const locationById = new Map(locations.map((l) => [l.id, l]));

    // Alocacao inicial DELIBERADAMENTE cruzada: A fica com um vizinho de B e vice-versa.
    const badAssignments: RouteAssignmentResult[] = [
      { routeId: "A", locationIds: ["L1", "L3"] },
      { routeId: "B", locationIds: ["L2", "L4"] },
    ];

    const improved = improveAssignmentsAcrossRoutes(
      [routeA, routeB],
      badAssignments,
      locationById,
      indexOf,
      distanceMeters,
      durationSeconds,
      null,
      new Set()
    );

    const finalA = improved.find((a) => a.routeId === "A")!.locationIds.sort();
    const finalB = improved.find((a) => a.routeId === "B")!.locationIds.sort();

    // O otimo e cada rota ficar com seus 2 vizinhos naturais.
    expect(finalA).toEqual(["L1", "L2"]);
    expect(finalB).toEqual(["L3", "L4"]);
  });

  it("nunca move uma localizacao forcada pelo usuario", () => {
    const { indexOf, distanceMeters, durationSeconds } = buildLineMatrix();

    const routeA = makeRoute("A", 2);
    const routeB = makeRoute("B", 2);
    const locations = [makeLocation("L1"), makeLocation("L2"), makeLocation("L3"), makeLocation("L4")];
    const locationById = new Map(locations.map((l) => [l.id, l]));

    const badAssignments: RouteAssignmentResult[] = [
      { routeId: "A", locationIds: ["L1", "L3"] },
      { routeId: "B", locationIds: ["L2", "L4"] },
    ];

    // L3 foi forcado manualmente pro usuario na rota A — mesmo sendo geograficamente
    // ruim ali, a melhoria automatica nao pode desfazer essa escolha.
    const improved = improveAssignmentsAcrossRoutes(
      [routeA, routeB],
      badAssignments,
      locationById,
      indexOf,
      distanceMeters,
      durationSeconds,
      null,
      new Set(["L3"])
    );

    const finalA = improved.find((a) => a.routeId === "A")!.locationIds;
    expect(finalA).toContain("L3");
  });

  it("nao muda nada quando so ha uma rota (nada pra comparar)", () => {
    const { indexOf, distanceMeters, durationSeconds } = buildLineMatrix();
    const routeA = makeRoute("A", 4);
    const locations = [makeLocation("L1"), makeLocation("L2")];
    const locationById = new Map(locations.map((l) => [l.id, l]));
    const assignments: RouteAssignmentResult[] = [{ routeId: "A", locationIds: ["L1", "L2"] }];

    const improved = improveAssignmentsAcrossRoutes(
      [routeA],
      assignments,
      locationById,
      indexOf,
      distanceMeters,
      durationSeconds,
      null,
      new Set()
    );

    expect(improved).toEqual(assignments);
  });
});
