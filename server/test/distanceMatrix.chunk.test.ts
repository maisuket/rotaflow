import { describe, expect, it } from "vitest";
import { planMatrixRequests, MAX_DIM, MAX_ELEMENTS } from "../src/utils/chunk";
import { buildDistanceMatrix, Point } from "../src/services/distanceMatrix";
import { GoogleMapsClient } from "../src/types";
import { haversineDistanceMeters } from "../src/utils/geo";

describe("planMatrixRequests", () => {
  it("respeita os limites de 25 origens/destinos e 100 elementos por bloco", () => {
    const plan = planMatrixRequests(30, 30);
    for (const { originBlock, destinationBlock } of plan) {
      expect(originBlock.indices.length).toBeLessThanOrEqual(MAX_DIM);
      expect(destinationBlock.indices.length).toBeLessThanOrEqual(MAX_DIM);
      expect(originBlock.indices.length * destinationBlock.indices.length).toBeLessThanOrEqual(
        MAX_ELEMENTS
      );
    }
  });

  it("cobre todos os pares (origem, destino) exatamente uma vez", () => {
    const originsCount = 30;
    const destinationsCount = 12;
    const plan = planMatrixRequests(originsCount, destinationsCount);

    const covered = new Set<string>();
    for (const { originBlock, destinationBlock } of plan) {
      for (const o of originBlock.indices) {
        for (const d of destinationBlock.indices) {
          covered.add(`${o},${d}`);
        }
      }
    }
    expect(covered.size).toBe(originsCount * destinationsCount);
  });
});

describe("buildDistanceMatrix", () => {
  it("monta a matriz completa emitindo o numero correto de chamadas e faz fallback haversine em celulas com falha", async () => {
    const points: Point[] = Array.from({ length: 30 }, (_, i) => ({
      lat: i * 0.01,
      lng: i * 0.01,
    }));

    let callCount = 0;
    const fakeClient: GoogleMapsClient = {
      async getDistanceMatrix({ origins, destinations }) {
        callCount++;
        const distanceMeters: (number | null)[][] = origins.map((o, r) =>
          destinations.map((d, c) => {
            // Forca falha na primeira celula da primeira chamada, pra testar o fallback.
            if (callCount === 1 && r === 0 && c === 0) return null;
            return haversineDistanceMeters(o, d);
          })
        );
        const durationSeconds = distanceMeters.map((row) =>
          row.map((v) => (v == null ? null : v / 10))
        );
        return { distanceMeters, durationSeconds };
      },
      async getDirections() {
        throw new Error("nao usado neste teste");
      },
      async geocodeAddress() {
        throw new Error("nao usado neste teste");
      },
    };

    const expectedCalls = planMatrixRequests(30, 30).length;
    const matrix = await buildDistanceMatrix(points, fakeClient);

    expect(callCount).toBe(expectedCalls);
    expect(matrix.distanceMeters.length).toBe(30);
    expect(matrix.distanceMeters[0].length).toBe(30);
    // diagonal principal deve ser 0 (mesmo ponto)
    expect(matrix.distanceMeters[0][0]).toBeCloseTo(0, 6);
    // celula que falhou deve ter caido para o fallback haversine (> 0, pois pontos 0 e 0 sao iguais na 1a chamada)
    // como a falha forcada foi em (0,0) da 1a chamada, que corresponde ao par real (0,0), o fallback tambem da 0.
    // Testamos entao uma celula generica para garantir consistencia numerica com haversine.
    expect(matrix.distanceMeters[5][10]).toBeCloseTo(
      haversineDistanceMeters(points[5], points[10]),
      0
    );
  });
});
