import { describe, expect, it } from "vitest";
import { solveOpenTsp, solveTspForRoute } from "../src/services/tsp";

/** Gera todas as permutacoes de um array (uso apenas em teste, n pequeno). */
function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

function bruteForceOptimalDistance(
  startIdx: number,
  stopIndices: number[],
  distanceMeters: number[][],
  endIdx: number | null
): number {
  let best = Infinity;
  for (const perm of permutations(stopIndices)) {
    const tour = [startIdx, ...perm, ...(endIdx !== null ? [endIdx] : [])];
    let total = 0;
    for (let i = 0; i < tour.length - 1; i++) {
      total += distanceMeters[tour[i]][tour[i + 1]];
    }
    if (total < best) best = total;
  }
  return best;
}

// Distancia euclidiana entre pontos, usada so para montar a matriz de teste.
function euclidean(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function buildMatrix(points: [number, number][]): number[][] {
  return points.map((p, i) => points.map((q, j) => (i === j ? 0 : euclidean(p, q))));
}

describe("solveTspForRoute", () => {
  it("encontra a ordem otima em uma configuracao simples de linha (retornando ao deposito)", () => {
    // depot em 0, paradas em 1,2,3,4 alinhadas -> otimo obvio: visitar em ordem
    const points: [number, number][] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ];
    const distanceMeters = buildMatrix(points);
    const durationSeconds = distanceMeters; // escala nao importa pro teste

    const result = solveTspForRoute(0, [1, 2, 3, 4], distanceMeters, durationSeconds, 0);

    expect(result.order).toEqual([0, 1, 2, 3, 4, 0]);
    expect(result.totalDistanceMeters).toBeCloseTo(8, 6); // ida 4 + volta 4
  });

  it("encontra a ordem otima em uma configuracao simples de linha (trajeto aberto, sem retorno)", () => {
    const points: [number, number][] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ];
    const distanceMeters = buildMatrix(points);
    const durationSeconds = distanceMeters;

    const result = solveTspForRoute(0, [1, 2, 3], distanceMeters, durationSeconds, null);

    expect(result.order).toEqual([0, 1, 2, 3]);
    expect(result.totalDistanceMeters).toBeCloseTo(3, 6);
  });

  it("2-opt nunca piora o resultado e converge para o otimo global (verificado por forca bruta)", () => {
    // Configuracao com potencial de tour cruzado para o nearest-neighbor puro
    const points: [number, number][] = [
      [0, 0], // depot
      [10, 0], // stop 1
      [10, 10], // stop 2
      [0, 10], // stop 3
      [5, 15], // stop 4 (fora do quadrado, forca reordenacao)
    ];
    const distanceMeters = buildMatrix(points);
    const durationSeconds = distanceMeters;
    const stopIndices = [1, 2, 3, 4];

    const optimal = bruteForceOptimalDistance(0, stopIndices, distanceMeters, 0);
    const result = solveTspForRoute(0, stopIndices, distanceMeters, durationSeconds, 0);

    expect(result.totalDistanceMeters).toBeCloseTo(optimal, 6);
    // garante que todas as paradas aparecem exatamente uma vez
    const visited = result.order.slice(1, -1).sort();
    expect(visited).toEqual([...stopIndices].sort());
  });

  it("retorna tour vazio (so ida e volta ao deposito) quando a rota nao tem paradas", () => {
    const distanceMeters = [[0]];
    const result = solveTspForRoute(0, [], distanceMeters, distanceMeters, 0);
    expect(result.order).toEqual([0, 0]);
    expect(result.totalDistanceMeters).toBe(0);
  });

  it("termina em um destino global diferente do ponto de partida (ambas as pontas fixas)", () => {
    // ponto 0 = origem, ponto 5 = destino compartilhado (diferente da origem),
    // paradas 1..4 no meio -> o otimo com ambas as pontas fixas ainda deve ser
    // verificavel por forca bruta.
    const points: [number, number][] = [
      [0, 0], // origem
      [10, 0],
      [10, 10],
      [0, 10],
      [5, 15],
      [20, 20], // destino global, distinto da origem
    ];
    const distanceMeters = buildMatrix(points);
    const durationSeconds = distanceMeters;
    const stopIndices = [1, 2, 3, 4];
    const endIdx = 5;

    const optimal = bruteForceOptimalDistance(0, stopIndices, distanceMeters, endIdx);
    const result = solveTspForRoute(0, stopIndices, distanceMeters, durationSeconds, endIdx);

    expect(result.totalDistanceMeters).toBeCloseTo(optimal, 6);
    expect(result.order[0]).toBe(0);
    expect(result.order[result.order.length - 1]).toBe(endIdx);
    const visited = result.order.slice(1, -1).sort();
    expect(visited).toEqual([...stopIndices].sort());
  });

  it("respeita lockedLastIdx mesmo quando isso nao e o mais eficiente", () => {
    // Sem trava, a ordem otima e 0 -> 1 -> 2 -> 3 -> 4 -> 0 (linha reta).
    // Travando o ponto 1 (o mais PROXIMO do deposito) como ULTIMO antes de
    // voltar, o tour tem que sacrificar eficiencia pra respeitar a trava.
    const points: [number, number][] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ];
    const distanceMeters = buildMatrix(points);
    const durationSeconds = distanceMeters;

    const result = solveTspForRoute(0, [1, 2, 3, 4], distanceMeters, durationSeconds, 0, null, 1);

    expect(result.order[result.order.length - 2]).toBe(1);
    expect(result.order[result.order.length - 1]).toBe(0);
    const visited = result.order.slice(1, -2).sort();
    expect(visited).toEqual([2, 3, 4]);
  });

  it("respeita lockedFirstIdx logo apos o deposito", () => {
    const points: [number, number][] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ];
    const distanceMeters = buildMatrix(points);
    const durationSeconds = distanceMeters;

    // Trava o ponto 4 (o mais LONGE) como primeiro apos o deposito.
    const result = solveTspForRoute(0, [1, 2, 3, 4], distanceMeters, durationSeconds, 0, 4, null);

    expect(result.order[0]).toBe(0);
    expect(result.order[1]).toBe(4);
    const visited = result.order.slice(2, -1).sort();
    expect(visited).toEqual([1, 2, 3]);
  });

  it("ignora uma trava cujo indice nao esta entre as paradas da rota", () => {
    const points: [number, number][] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ];
    const distanceMeters = buildMatrix(points);
    const durationSeconds = distanceMeters;

    // lockedLastIdx=99 nao existe entre stopIndices [1,2,3] -> deve ser ignorado.
    const result = solveTspForRoute(0, [1, 2, 3], distanceMeters, durationSeconds, 0, null, 99);

    expect(result.order).toEqual([0, 1, 2, 3, 0]);
  });
});

function bruteForceOptimalOpenPath(
  pointIndices: number[],
  distanceMeters: number[][],
  endIdx: number | null
): number {
  let best = Infinity;
  for (const perm of permutations(pointIndices)) {
    const tour = [...perm, ...(endIdx !== null ? [endIdx] : [])];
    let total = 0;
    for (let i = 0; i < tour.length - 1; i++) {
      total += distanceMeters[tour[i]][tour[i + 1]];
    }
    if (total < best) best = total;
  }
  return best;
}

describe("solveOpenTsp", () => {
  it("encontra o caminho aberto otimo sem ponto de partida fixo (verificado por forca bruta)", () => {
    const points: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [5, 15],
    ];
    const distanceMeters = buildMatrix(points);
    const durationSeconds = distanceMeters;
    const pointIndices = [0, 1, 2, 3, 4];

    const optimal = bruteForceOptimalOpenPath(pointIndices, distanceMeters, null);
    const result = solveOpenTsp(pointIndices, distanceMeters, durationSeconds, null);

    expect(result.totalDistanceMeters).toBeCloseTo(optimal, 6);
    const visited = [...result.order].sort();
    expect(visited).toEqual([...pointIndices].sort());
  });

  it("com destino fixo, deixa a origem livre mas termina sempre no destino", () => {
    const points: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [5, 15],
      [30, 30], // destino compartilhado
    ];
    const distanceMeters = buildMatrix(points);
    const durationSeconds = distanceMeters;
    const pointIndices = [0, 1, 2, 3, 4];
    const endIdx = 5;

    const optimal = bruteForceOptimalOpenPath(pointIndices, distanceMeters, endIdx);
    const result = solveOpenTsp(pointIndices, distanceMeters, durationSeconds, endIdx);

    expect(result.totalDistanceMeters).toBeCloseTo(optimal, 6);
    expect(result.order[result.order.length - 1]).toBe(endIdx);
    const visited = result.order.slice(0, -1).sort();
    expect(visited).toEqual([...pointIndices].sort());
  });

  it("com um unico ponto, o trajeto e so ele (ou ele + destino, se houver)", () => {
    const distanceMeters = [
      [0, 5],
      [5, 0],
    ];
    const result = solveOpenTsp([0], distanceMeters, distanceMeters, 1);
    expect(result.order).toEqual([0, 1]);
    expect(result.totalDistanceMeters).toBe(5);

    const resultNoEnd = solveOpenTsp([0], distanceMeters, distanceMeters, null);
    expect(resultNoEnd.order).toEqual([0]);
    expect(resultNoEnd.totalDistanceMeters).toBe(0);
  });

  it("lockedFirstIdx forca a origem, mesmo nao sendo o ponto extremo escolhido pela heuristica", () => {
    const points: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [5, 15],
    ];
    const distanceMeters = buildMatrix(points);
    const durationSeconds = distanceMeters;
    const pointIndices = [0, 1, 2, 3, 4];

    // Forca o ponto 3 (nao seria a escolha natural da heuristica) como origem.
    const result = solveOpenTsp(pointIndices, distanceMeters, durationSeconds, null, 3, null);

    expect(result.order[0]).toBe(3);
    const visited = [...result.order].sort();
    expect(visited).toEqual([...pointIndices].sort());
  });

  it("lockedLastIdx trava uma parada logo antes do fim (ou como o proprio fim, sem endIdx)", () => {
    const points: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [5, 15],
    ];
    const distanceMeters = buildMatrix(points);
    const durationSeconds = distanceMeters;
    const pointIndices = [0, 1, 2, 3, 4];

    const result = solveOpenTsp(pointIndices, distanceMeters, durationSeconds, null, null, 1);

    expect(result.order[result.order.length - 1]).toBe(1);
    const visited = [...result.order].sort();
    expect(visited).toEqual([...pointIndices].sort());
  });
});
