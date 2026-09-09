import { describe, expect, it } from "vitest";
import { detectOutliers } from "../src/services/outliers";

function euclidean(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function buildMatrix(points: [number, number][]): number[][] {
  return points.map((p, i) => points.map((q, j) => (i === j ? 0 : euclidean(p, q))));
}

describe("detectOutliers", () => {
  it("sinaliza uma localizacao isolada, muito mais longe do que as demais", () => {
    // 5 pontos bem proximos entre si (cluster denso) + 1 ponto isolado bem longe
    const ids = ["A", "B", "C", "D", "E", "FAR"];
    const points: [number, number][] = [
      [0, 0],
      [100, 0],
      [0, 100],
      [100, 100],
      [50, 50],
      [50000, 50000], // bem longe (em metros, ~70km de distancia dos outros)
    ];
    const distanceMeters = buildMatrix(points);
    const indexOf = new Map(ids.map((id, i) => [id, i]));

    const outliers = detectOutliers(ids, distanceMeters, indexOf);

    expect(outliers.map((o) => o.locationId)).toEqual(["FAR"]);
  });

  it("nao sinaliza nada quando todas as localizacoes estao razoavelmente espalhadas", () => {
    const ids = ["A", "B", "C", "D", "E"];
    const points: [number, number][] = [
      [0, 0],
      [1000, 0],
      [2000, 1000],
      [500, 2000],
      [1500, 1500],
    ];
    const distanceMeters = buildMatrix(points);
    const indexOf = new Map(ids.map((id, i) => [id, i]));

    const outliers = detectOutliers(ids, distanceMeters, indexOf);
    expect(outliers).toEqual([]);
  });

  it("nao roda com poucas localizacoes (amostra pequena demais)", () => {
    const ids = ["A", "B", "C"];
    const points: [number, number][] = [
      [0, 0],
      [1, 0],
      [100000, 100000],
    ];
    const distanceMeters = buildMatrix(points);
    const indexOf = new Map(ids.map((id, i) => [id, i]));

    expect(detectOutliers(ids, distanceMeters, indexOf)).toEqual([]);
  });
});
