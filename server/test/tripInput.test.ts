import { describe, expect, it } from "vitest";
import { parseTripRouteInput } from "../src/services/tripInput";

function makeValidRoute(overrides: Partial<any> = {}) {
  return {
    routeId: "r1",
    routeName: "Rota A",
    driverName: "Joao",
    driverPhone: "92999990000",
    vehiclePlate: "ABC1D23",
    vehicleTypeLabel: "Van",
    depot: { lat: -3.1, lng: -60.0 },
    destination: null,
    capacity: 5,
    totalDistanceMeters: 1000,
    totalDurationSeconds: 300,
    estimatedCost: 12.5,
    mapsUrl: "https://maps.google.com/x",
    stops: [
      { locationId: "l1", name: "Ana", lat: -3.11, lng: -60.01, demand: 1, etaSeconds: 100 },
      { locationId: "l2", name: "Bruno", lat: -3.12, lng: -60.02, demand: 2, etaSeconds: 200 },
    ],
    ...overrides,
  };
}

describe("parseTripRouteInput", () => {
  it("converte um item valido, atribuindo order pela posicao na lista de stops", () => {
    const result = parseTripRouteInput(makeValidRoute(), 0);

    expect(result.routeId).toBe("r1");
    expect(result.routeName).toBe("Rota A");
    expect(result.driverName).toBe("Joao");
    expect(result.depot).toEqual({ lat: -3.1, lng: -60.0 });
    expect(result.stops.map((s) => s.order)).toEqual([1, 2]);
    expect(result.stops[0].locationId).toBe("l1");
    expect(result.estimatedCost).toBe(12.5);
  });

  it("usa defaults sensatos quando campos opcionais estao ausentes", () => {
    const raw = makeValidRoute({
      routeId: undefined,
      driverName: undefined,
      estimatedCost: undefined,
      mapsUrl: undefined,
      stops: [{ name: "Ana", lat: -3.1, lng: -60.0 }],
    });
    const result = parseTripRouteInput(raw, 0);

    expect(result.routeId).toBeNull();
    expect(result.driverName).toBeNull();
    expect(result.estimatedCost).toBeNull();
    expect(result.mapsUrl).toBeNull();
    expect(result.stops[0].demand).toBe(1);
    expect(result.stops[0].locationId).toBeNull();
  });

  it("preserva destino quando presente e valido", () => {
    const raw = makeValidRoute({ destination: { lat: 1, lng: 2, name: "Fabrica" } });
    const result = parseTripRouteInput(raw, 0);
    expect(result.destination).toEqual({ lat: 1, lng: 2, name: "Fabrica" });
  });

  it("rejeita quando routeName esta ausente", () => {
    const raw = makeValidRoute({ routeName: undefined });
    expect(() => parseTripRouteInput(raw, 2)).toThrow(/routes\[2\]\.routeName/);
  });

  it("rejeita quando depot esta ausente ou invalido", () => {
    expect(() => parseTripRouteInput(makeValidRoute({ depot: undefined }), 0)).toThrow(/depot/);
    expect(() => parseTripRouteInput(makeValidRoute({ depot: { lat: "x", lng: 1 } }), 0)).toThrow(/depot/);
  });

  it("rejeita quando stops nao e uma lista", () => {
    expect(() => parseTripRouteInput(makeValidRoute({ stops: "nope" }), 0)).toThrow(/stops/);
  });

  it("rejeita quando falta totalDistanceMeters/totalDurationSeconds", () => {
    expect(() =>
      parseTripRouteInput(makeValidRoute({ totalDistanceMeters: undefined }), 0)
    ).toThrow(/totalDistanceMeters/);
  });

  it("rejeita um stop invalido dentro da lista", () => {
    const raw = makeValidRoute({ stops: [{ name: "Ana" }] }); // sem lat/lng
    expect(() => parseTripRouteInput(raw, 1)).toThrow(/stops\[0\]/);
  });
});
