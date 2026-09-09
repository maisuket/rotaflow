import { TspResult } from "../types";

function tourDistance(order: number[], distanceMeters: number[][]): number {
  let total = 0;
  for (let i = 0; i < order.length - 1; i++) {
    total += distanceMeters[order[i]][order[i + 1]];
  }
  return total;
}

function tourDuration(order: number[], durationSeconds: number[][]): number {
  let total = 0;
  for (let i = 0; i < order.length - 1; i++) {
    total += durationSeconds[order[i]][order[i + 1]];
  }
  return total;
}

/**
 * Custo de um tour JA DECIDIDO (nenhuma busca/otimizacao) — usado quando a
 * ordem vem de uma reordenacao manual do usuario, nao de nearest-neighbor+2-opt.
 */
export function computeFixedOrderTour(
  order: number[],
  distanceMeters: number[][],
  durationSeconds: number[][]
): TspResult {
  return {
    order,
    totalDistanceMeters: tourDistance(order, distanceMeters),
    totalDurationSeconds: tourDuration(order, durationSeconds),
  };
}

/**
 * Construcao por vizinho mais proximo, comecando no indice `startIdx`
 * e visitando os `stopIndices` restantes.
 */
function nearestNeighborTour(
  startIdx: number,
  stopIndices: number[],
  distanceMeters: number[][]
): number[] {
  const unvisited = new Set(stopIndices);
  const order = [startIdx];
  let current = startIdx;

  while (unvisited.size > 0) {
    let nearest = -1;
    let nearestDist = Infinity;
    for (const candidate of unvisited) {
      const d = distanceMeters[current][candidate];
      if (d < nearestDist) {
        nearestDist = d;
        nearest = candidate;
      }
    }
    order.push(nearest);
    unvisited.delete(nearest);
    current = nearest;
  }

  return order;
}

/**
 * Dentre `pointIndices`, retorna o ponto com a MAIOR distancia media aos
 * demais — uma heuristica de "extremidade", boa candidata a ponto de partida
 * quando o inicio do trajeto e livre (nao ha deposito fixo).
 */
function pickExtremePoint(pointIndices: number[], distanceMeters: number[][]): number {
  let best = pointIndices[0];
  let bestAvg = -Infinity;
  for (const p of pointIndices) {
    let sum = 0;
    for (const q of pointIndices) {
      if (q !== p) sum += distanceMeters[p][q];
    }
    const avg = sum / (pointIndices.length - 1);
    if (avg > bestAvg) {
      bestAvg = avg;
      best = p;
    }
  }
  return best;
}

/**
 * Calcula os limites [firstMutableIndex, lastMutableIndex] que o 2-opt pode
 * mexer, dado quantas posicoes fixas existem em cada ponta do tour. Uma
 * ponta "base" fixa (deposito ou destino) soma 1 posicao fixa; uma parada
 * travada pelo usuario (`lockedFirstIdx`/`lockedLastIdx`) soma mais 1 —
 * ela fica logo apos o deposito (ou logo antes do destino), nunca mexida.
 */
function computeMutableBounds(
  n: number,
  baseFixFirst: boolean,
  baseFixLast: boolean,
  hasLockedFirst: boolean,
  hasLockedLast: boolean
): { firstMutableIndex: number; lastMutableIndex: number } {
  let firstMutableIndex = baseFixFirst ? 1 : 0;
  if (hasLockedFirst) firstMutableIndex += 1;
  let lastMutableIndex = baseFixLast ? n - 2 : n - 1;
  if (hasLockedLast) lastMutableIndex -= 1;
  return { firstMutableIndex, lastMutableIndex };
}

/**
 * 2-opt local search: tenta inverter segmentos do tour para reduzir a
 * distancia total. `firstMutableIndex`/`lastMutableIndex` (inclusive) delimitam
 * quais posicoes do tour podem ser mexidas — fora desse intervalo ficam
 * posicoes fixas (deposito, destino compartilhado, ou uma parada travada
 * pelo usuario). Para quando nenhuma troca melhora o tour, ou apos
 * MAX_ITERATIONS passadas.
 */
function twoOpt(
  tour: number[],
  distanceMeters: number[][],
  firstMutableIndex: number,
  lastMutableIndex: number
): number[] {
  const MAX_ITERATIONS = 500;
  let best = tour.slice();
  let improved = true;
  let iterations = 0;
  const n = best.length;

  while (improved && iterations < MAX_ITERATIONS) {
    improved = false;
    iterations++;

    for (let i = firstMutableIndex; i < lastMutableIndex; i++) {
      for (let j = i + 1; j <= lastMutableIndex; j++) {
        const hasPredecessor = i > 0;
        const a = hasPredecessor ? best[i - 1] : null;
        const b = best[i];
        const c = best[j];
        const hasSuccessor = j + 1 < n;
        const d = hasSuccessor ? best[j + 1] : null;

        const currentCost =
          (hasPredecessor ? distanceMeters[a as number][b] : 0) +
          (hasSuccessor ? distanceMeters[c][d as number] : 0);
        const newCost =
          (hasPredecessor ? distanceMeters[a as number][c] : 0) +
          (hasSuccessor ? distanceMeters[b][d as number] : 0);

        if (newCost < currentCost - 1e-9) {
          best = best
            .slice(0, i)
            .concat(best.slice(i, j + 1).reverse(), best.slice(j + 1));
          improved = true;
        }
      }
    }
  }

  return best;
}

/**
 * Ordena as paradas de uma rota unica: comeca no ponto `startIdx` (o deposito,
 * no espaco global de pontos), visita todos os `stopIndices`, e termina em
 * `endIdx` se fornecido (pode ser o proprio deposito, para "retornar", ou um
 * destino compartilhado diferente), ou fica aberta na ultima parada se `endIdx`
 * for null.
 *
 * `lockedFirstIdx`/`lockedLastIdx` (opcionais) travam uma parada especifica
 * logo apos o deposito, ou logo antes do fim do trajeto — ex: "essa pessoa
 * tem que ser a ultima, ela sai depois do trabalho". Ignorados se o indice
 * nao estiver em `stopIndices` (parada nao faz parte desta rota).
 *
 * Funcao pura sobre a matriz de distancias/duracoes — nao faz nenhuma
 * chamada de rede, o que a torna totalmente testavel offline.
 */
export function solveTspForRoute(
  startIdx: number,
  stopIndices: number[],
  distanceMeters: number[][],
  durationSeconds: number[][],
  endIdx: number | null,
  lockedFirstIdx: number | null = null,
  lockedLastIdx: number | null = null
): TspResult {
  if (stopIndices.length === 0) {
    const order = endIdx !== null ? [startIdx, endIdx] : [startIdx];
    return {
      order,
      totalDistanceMeters:
        endIdx !== null ? distanceMeters[startIdx][endIdx] : 0,
      totalDurationSeconds:
        endIdx !== null ? durationSeconds[startIdx][endIdx] : 0,
    };
  }

  const validLockedFirst =
    lockedFirstIdx !== null && stopIndices.includes(lockedFirstIdx) ? lockedFirstIdx : null;
  const validLockedLastRaw =
    lockedLastIdx !== null && stopIndices.includes(lockedLastIdx) ? lockedLastIdx : null;
  // Uma parada nao pode travar como primeira E ultima ao mesmo tempo — a primeira trava vence.
  const validLockedLast = validLockedLastRaw === validLockedFirst ? null : validLockedLastRaw;

  const remaining = stopIndices.filter(
    (idx) => idx !== validLockedFirst && idx !== validLockedLast
  );

  let initial = validLockedFirst !== null
    ? [startIdx, ...nearestNeighborTour(validLockedFirst, remaining, distanceMeters)]
    : nearestNeighborTour(startIdx, remaining, distanceMeters);
  if (validLockedLast !== null) initial = initial.concat(validLockedLast);

  const withEnd = endIdx !== null ? initial.concat(endIdx) : initial;

  const { firstMutableIndex, lastMutableIndex } = computeMutableBounds(
    withEnd.length,
    true,
    endIdx !== null,
    validLockedFirst !== null,
    validLockedLast !== null
  );
  const optimized = twoOpt(withEnd, distanceMeters, firstMutableIndex, lastMutableIndex);

  return {
    order: optimized,
    totalDistanceMeters: tourDistance(optimized, distanceMeters),
    totalDurationSeconds: tourDuration(optimized, durationSeconds),
  };
}

/**
 * Ordena um grupo de pontos SEM ponto de partida fixo (usado no modo
 * automatico, onde nao ha deposito — a origem sai de qualquer um dos proprios
 * passageiros, o que a otimizacao achar melhor). Se `endIdx` for fornecido
 * (destino global compartilhado), o trajeto termina la; senao fica aberto na
 * ultima parada.
 *
 * `order[0]` apos a otimizacao e o ponto escolhido como origem da rota — a
 * menos que `lockedFirstIdx` seja dado, e ai essa parada especifica sempre
 * vira a origem. `lockedLastIdx` trava uma parada logo antes do fim do
 * trajeto (ou como o proprio fim, se nao houver `endIdx`). Ambos ignorados
 * se o indice nao estiver em `pointIndices`.
 */
export function solveOpenTsp(
  pointIndices: number[],
  distanceMeters: number[][],
  durationSeconds: number[][],
  endIdx: number | null,
  lockedFirstIdx: number | null = null,
  lockedLastIdx: number | null = null
): TspResult {
  if (pointIndices.length === 0) {
    return { order: [], totalDistanceMeters: 0, totalDurationSeconds: 0 };
  }

  if (pointIndices.length === 1) {
    const only = pointIndices[0];
    const order = endIdx !== null ? [only, endIdx] : [only];
    return {
      order,
      totalDistanceMeters: endIdx !== null ? distanceMeters[only][endIdx] : 0,
      totalDurationSeconds: endIdx !== null ? durationSeconds[only][endIdx] : 0,
    };
  }

  const validLockedFirst =
    lockedFirstIdx !== null && pointIndices.includes(lockedFirstIdx) ? lockedFirstIdx : null;
  const validLockedLastRaw =
    lockedLastIdx !== null && pointIndices.includes(lockedLastIdx) ? lockedLastIdx : null;
  const validLockedLast = validLockedLastRaw === validLockedFirst ? null : validLockedLastRaw;

  const start = validLockedFirst ?? pickExtremePoint(pointIndices, distanceMeters);
  const rest = pointIndices.filter((p) => p !== start && p !== validLockedLast);
  let initial = nearestNeighborTour(start, rest, distanceMeters);
  if (validLockedLast !== null) initial = initial.concat(validLockedLast);

  const withEnd = endIdx !== null ? initial.concat(endIdx) : initial;

  const { firstMutableIndex, lastMutableIndex } = computeMutableBounds(
    withEnd.length,
    validLockedFirst !== null,
    endIdx !== null,
    false,
    validLockedLast !== null
  );
  const optimized = twoOpt(withEnd, distanceMeters, firstMutableIndex, lastMutableIndex);

  return {
    order: optimized,
    totalDistanceMeters: tourDistance(optimized, distanceMeters),
    totalDurationSeconds: tourDuration(optimized, durationSeconds),
  };
}
