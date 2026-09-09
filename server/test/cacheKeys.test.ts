import { describe, expect, it } from "vitest";
import { directionsRouteKey, distancePairKey, geocodeQueryKey, pointKey } from "../src/services/cacheKeys";

describe("pointKey", () => {
  it("arredonda a 6 casas decimais de forma estavel", () => {
    expect(pointKey({ lat: -3.1, lng: -60.02 })).toBe("-3.100000,-60.020000");
  });

  it("trata ruido de ponto flutuante como o mesmo ponto", () => {
    const a = pointKey({ lat: 0.1 + 0.2, lng: -60 }); // 0.30000000000000004 em JS
    const b = pointKey({ lat: 0.3, lng: -60 });
    expect(a).toBe(b);
  });
});

describe("distancePairKey", () => {
  it("e diferente pra direcoes opostas (A->B != B->A)", () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 1, lng: 1 };
    expect(distancePairKey(a, b)).not.toBe(distancePairKey(b, a));
  });

  it("e igual pro mesmo par repetido", () => {
    const a = { lat: -3.1, lng: -60.02 };
    const b = { lat: -3.2, lng: -60.03 };
    expect(distancePairKey(a, b)).toBe(distancePairKey({ ...a }, { ...b }));
  });
});

describe("directionsRouteKey", () => {
  it("muda quando a ordem das paradas muda", () => {
    const origin = { lat: 0, lng: 0 };
    const destination = { lat: 5, lng: 5 };
    const keyAB = directionsRouteKey(origin, [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }], destination);
    const keyBA = directionsRouteKey(origin, [{ lat: 2, lng: 2 }, { lat: 1, lng: 1 }], destination);
    expect(keyAB).not.toBe(keyBA);
  });

  it("e estavel pro mesmo trajeto", () => {
    const origin = { lat: 0, lng: 0 };
    const destination = { lat: 5, lng: 5 };
    const waypoints = [{ lat: 1, lng: 1 }];
    expect(directionsRouteKey(origin, waypoints, destination)).toBe(
      directionsRouteKey({ ...origin }, [{ ...waypoints[0] }], { ...destination })
    );
  });

  it("funciona sem waypoints (rota direta)", () => {
    const origin = { lat: 0, lng: 0 };
    const destination = { lat: 5, lng: 5 };
    expect(directionsRouteKey(origin, [], destination)).toBe("0.000000,0.000000>5.000000,5.000000");
  });
});

describe("geocodeQueryKey", () => {
  it("normaliza caixa e espacos nas bordas", () => {
    expect(geocodeQueryKey("  Rua Teste, 123  ")).toBe("rua teste, 123");
  });

  it("colapsa espacos internos multiplos", () => {
    expect(geocodeQueryKey("Rua   Teste    123")).toBe("rua teste 123");
  });

  it("trata buscas equivalentes (caixa/espacos diferentes) como a mesma chave", () => {
    expect(geocodeQueryKey("Avenida Djalma Batista")).toBe(geocodeQueryKey("  AVENIDA   djalma BATISTA "));
  });
});
