import { describe, expect, it } from "vitest";
import { assignLocationsToRoutes } from "../src/services/assignment";
import { Location, RouteVehicle } from "../src/types";

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

describe("assignLocationsToRoutes", () => {
  it("aloca cada localizacao a rota cujo deposito esta mais proximo, respeitando capacidade", () => {
    // 2 depositos (indices 0 e 1), 5 localizacoes (indices 2..6)
    // depot A (idx 0) fica perto das locations 2,3 ; depot B (idx 1) fica perto de 4,5,6
    const routeA = makeRoute("A", 2);
    const routeB = makeRoute("B", 3);
    const locations = [
      makeLocation("L2"),
      makeLocation("L3"),
      makeLocation("L4"),
      makeLocation("L5"),
      makeLocation("L6"),
    ];
    const pointIndexOf = new Map<string, number>([
      ["A", 0],
      ["B", 1],
      ["L2", 2],
      ["L3", 3],
      ["L4", 4],
      ["L5", 5],
      ["L6", 6],
    ]);

    // matriz 7x7: distancia simetrica hipotetica
    const n = 7;
    const d: number[][] = Array.from({ length: n }, () => new Array(n).fill(1000));
    const setDist = (a: number, b: number, v: number) => {
      d[a][b] = v;
      d[b][a] = v;
    };
    setDist(0, 2, 1); // A-L2
    setDist(0, 3, 2); // A-L3
    setDist(1, 4, 1); // B-L4
    setDist(1, 5, 2); // B-L5
    setDist(1, 6, 3); // B-L6
    setDist(0, 4, 50);
    setDist(0, 5, 50);
    setDist(0, 6, 50);
    setDist(1, 2, 50);
    setDist(1, 3, 50);

    const result = assignLocationsToRoutes(locations, [routeA, routeB], d, pointIndexOf);

    const assignA = result.assignments.find((a) => a.routeId === "A")!;
    const assignB = result.assignments.find((a) => a.routeId === "B")!;

    expect(assignA.locationIds.sort()).toEqual(["L2", "L3"]);
    expect(assignB.locationIds.sort()).toEqual(["L4", "L5", "L6"]);
    expect(result.unassignedLocationIds).toEqual([]);
  });

  it("marca como unassigned localizacoes que nao cabem em nenhuma rota", () => {
    const route = makeRoute("A", 1);
    const locations = [makeLocation("L1"), makeLocation("L2")];
    const pointIndexOf = new Map([
      ["A", 0],
      ["L1", 1],
      ["L2", 2],
    ]);
    const d = [
      [0, 1, 1],
      [1, 0, 5],
      [1, 5, 0],
    ];

    const result = assignLocationsToRoutes(locations, [route], d, pointIndexOf);

    expect(result.assignments[0].locationIds).toEqual(["L1"]);
    expect(result.unassignedLocationIds).toEqual(["L2"]);
  });

  it("marca todas as localizacoes como unassigned quando nao ha rotas", () => {
    const locations = [makeLocation("L1")];
    const result = assignLocationsToRoutes(locations, [], [[0]], new Map([["L1", 0]]));
    expect(result.unassignedLocationIds).toEqual(["L1"]);
    expect(result.assignments).toEqual([]);
  });

  it("forcedAssignments coloca a localizacao na rota escolhida direto, sem passar pela heuristica", () => {
    const routeA = makeRoute("A", 5);
    const routeB = makeRoute("B", 5);
    const locations = [makeLocation("L1"), makeLocation("L2")];
    const pointIndexOf = new Map([
      ["A", 0],
      ["B", 1],
      ["L1", 2],
      ["L2", 3],
    ]);
    // L2 esta muito mais perto de B do que de A — a heuristica normal colocaria em B.
    const d = [
      [0, 100, 1, 50],
      [100, 0, 100, 1],
      [1, 100, 0, 100],
      [50, 1, 100, 0],
    ];

    // Forca L2 pra rota A mesmo assim (o usuario decidiu isso, nao a proximidade).
    const forced = new Map([["L2", "A"]]);
    const result = assignLocationsToRoutes(locations, [routeA, routeB], d, pointIndexOf, forced);

    const assignA = result.assignments.find((a) => a.routeId === "A")!;
    const assignB = result.assignments.find((a) => a.routeId === "B")!;
    expect(assignA.locationIds).toContain("L2");
    expect(assignB.locationIds).not.toContain("L2");
    expect(result.unassignedLocationIds).toEqual([]);
  });

  it("forcedAssignments desconta a capacidade da rota, podendo deixar outra localizacao sem rota", () => {
    const route = makeRoute("A", 1);
    const locations = [makeLocation("L1"), makeLocation("L2")];
    const pointIndexOf = new Map([
      ["A", 0],
      ["L1", 1],
      ["L2", 2],
    ]);
    const d = [
      [0, 1, 1],
      [1, 0, 5],
      [1, 5, 0],
    ];

    // Capacidade 1: forcar L2 consome a unica vaga, entao L1 (que normalmente
    // entraria pela heuristica) fica sem rota — comportamento intencional.
    const forced = new Map([["L2", "A"]]);
    const result = assignLocationsToRoutes(locations, [route], d, pointIndexOf, forced);

    expect(result.assignments[0].locationIds).toEqual(["L2"]);
    expect(result.unassignedLocationIds).toEqual(["L1"]);
  });

  it("ignora forcedAssignments que apontam para uma rota inexistente", () => {
    const route = makeRoute("A", 5);
    const locations = [makeLocation("L1")];
    const pointIndexOf = new Map([
      ["A", 0],
      ["L1", 1],
    ]);
    const d = [
      [0, 1],
      [1, 0],
    ];
    const forced = new Map([["L1", "ROTA-QUE-NAO-EXISTE"]]);

    const result = assignLocationsToRoutes(locations, [route], d, pointIndexOf, forced);

    // Cai de volta pra heuristica normal (so tem uma rota, entao aloca nela mesmo assim)
    expect(result.assignments[0].locationIds).toEqual(["L1"]);
    expect(result.unassignedLocationIds).toEqual([]);
  });
});
