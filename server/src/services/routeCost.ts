import { solveOpenTsp, solveTspForRoute } from "./tsp";
import { RouteVehicle, TspResult } from "../types";

/**
 * Resolve a ordem de visita (e o custo) de UMA rota para um conjunto de
 * paradas candidato, aplicando exatamente a mesma regra de origem/destino
 * usada no pipeline principal (`optimizePipeline.ts`):
 *
 * - `originMode: "firstPassenger"` (com pelo menos 1 parada) -> caminho
 *   aberto sem ponto de partida fixo (`solveOpenTsp`).
 * - Caso contrario -> comeca no deposito cadastrado (`solveTspForRoute`).
 * - Destino global sempre tem prioridade sobre returnToDepot/originMode.
 *
 * Extraido como funcao pura e reutilizavel para que o pipeline principal E a
 * melhoria entre rotas (`interRouteOptimizer.ts`) usem sempre a MESMA regra —
 * evita duas implementacoes divergindo com o tempo.
 *
 * `lockedFirstIdx`/`lockedLastIdx` (opcionais) travam uma parada especifica
 * como primeira ou ultima do trajeto — ver `solveTspForRoute`/`solveOpenTsp`.
 */
export function computeRouteTsp(
  route: RouteVehicle,
  stopIndices: number[],
  depotIdx: number,
  destinationIdx: number | null,
  distanceMeters: number[][],
  durationSeconds: number[][],
  lockedFirstIdx: number | null = null,
  lockedLastIdx: number | null = null
): TspResult {
  const usesFirstPassengerOrigin = route.originMode === "firstPassenger" && stopIndices.length > 0;

  const endIdx =
    destinationIdx ?? (usesFirstPassengerOrigin ? null : route.returnToDepot ? depotIdx : null);

  return usesFirstPassengerOrigin
    ? solveOpenTsp(stopIndices, distanceMeters, durationSeconds, endIdx, lockedFirstIdx, lockedLastIdx)
    : solveTspForRoute(
        depotIdx,
        stopIndices,
        distanceMeters,
        durationSeconds,
        endIdx,
        lockedFirstIdx,
        lockedLastIdx
      );
}

/**
 * Dado o tour completo (`order`, incluindo deposito/destino quando presentes)
 * e a matriz de duracoes, calcula o horario de chegada acumulado em cada
 * ponto do tour a partir de `departureSeconds`. Usa a MESMA matriz que gera
 * `totalDurationSeconds`, entao os ETAs por parada sempre batem com o total
 * exibido (em vez de misturar com os `legs` do Directions, que podem diferir
 * ligeiramente por virem de uma consulta separada).
 *
 * `speedFactor` (default 1) multiplica cada trecho — usado por veiculos mais
 * lentos que o carro de referencia do Google (ex: onibus). Nao afeta a
 * distancia, so a duracao/ETA reportada.
 */
export function computeArrivalByPointIndex(
  order: number[],
  durationSeconds: number[][],
  departureSeconds: number,
  speedFactor: number = 1
): Map<number, number> {
  const arrivalByIndex = new Map<number, number>();
  let cumulative = departureSeconds;
  arrivalByIndex.set(order[0], cumulative);
  for (let i = 1; i < order.length; i++) {
    cumulative += durationSeconds[order[i - 1]][order[i]] * speedFactor;
    arrivalByIndex.set(order[i], cumulative);
  }
  return arrivalByIndex;
}
