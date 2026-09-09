import { computeRouteTsp } from "./routeCost";
import { Location, RouteAssignmentResult, RouteVehicle } from "../types";

const MAX_SWEEPS = 25;
const EPSILON = 1e-6;

interface RouteState {
  route: RouteVehicle;
  depotIdx: number;
  locationIds: string[];
  demand: number;
  cost: number;
}

/**
 * Melhoria local ENTRE rotas, rodada depois da alocacao gulosa inicial
 * (`assignLocationsToRoutes`) e antes de gerar o resultado final.
 *
 * A alocacao gulosa e "cluster-first" — decide quem vai em qual rota so pela
 * distancia ao deposito, sem olhar pra ordenacao final. Isso deixa passageiros
 * mal-alocados quando duas rotas se sobrepoem geograficamente (alguem "mais
 * perto" do deposito A em linha reta pode fazer mais sentido na rota B
 * dependendo de como as ruas conectam). Esta funcao tenta 2 tipos de troca,
 * repetindo enquanto houver melhora (ou ate MAX_SWEEPS):
 *
 * 1. RELOCATE: mover 1 passageiro de uma rota pra outra, se a capacidade
 *    permitir e a distancia total das duas rotas somadas cair.
 * 2. SWAP: trocar 1 passageiro de cada rota entre si, se a distancia total
 *    somada cair (util quando nenhuma rota tem folga de capacidade pra um
 *    relocate simples, mas uma troca 1-por-1 ainda compensa).
 *
 * Passageiros em `forcedLocationIds` (o usuario forcou manualmente pra uma
 * rota especifica) nunca sao movidos daqui — a decisao do usuario e final.
 *
 * Nao mexe em localizacoes sem rota (`unassignedLocationIds`) — essa funcao
 * so reorganiza quem JA foi alocado, nao tenta encaixar quem ficou de fora.
 */
export function improveAssignmentsAcrossRoutes(
  routes: RouteVehicle[],
  assignments: RouteAssignmentResult[],
  locationById: Map<string, Location>,
  pointIndexOf: Map<string, number>,
  distanceMeters: number[][],
  durationSeconds: number[][],
  destinationIdx: number | null,
  forcedLocationIds: Set<string>
): RouteAssignmentResult[] {
  if (routes.length < 2) return assignments;

  const demandOf = (id: string) => locationById.get(id)!.demand;

  const costOf = (state: RouteState, candidateIds: string[]): number => {
    const stopIndices = candidateIds.map((id) => pointIndexOf.get(id)!);
    return computeRouteTsp(
      state.route,
      stopIndices,
      state.depotIdx,
      destinationIdx,
      distanceMeters,
      durationSeconds
    ).totalDistanceMeters;
  };

  const states: RouteState[] = assignments.map((a) => {
    const route = routes.find((r) => r.id === a.routeId)!;
    const depotIdx = pointIndexOf.get(route.id)!;
    const demand = a.locationIds.reduce((sum, id) => sum + demandOf(id), 0);
    const state: RouteState = { route, depotIdx, locationIds: [...a.locationIds], demand, cost: 0 };
    state.cost = costOf(state, state.locationIds);
    return state;
  });

  let sweep = 0;
  let improvedAny = true;

  while (improvedAny && sweep < MAX_SWEEPS) {
    improvedAny = false;
    sweep++;

    // --- RELOCATE: mover 1 localizacao de A pra B (direcionado: testa A->B e B->A) ---
    for (let i = 0; i < states.length; i++) {
      for (let j = 0; j < states.length; j++) {
        if (i === j) continue;
        const A = states[i];
        const B = states[j];

        for (const locId of [...A.locationIds]) {
          if (forcedLocationIds.has(locId)) continue;
          const demand = demandOf(locId);
          if (B.demand + demand > B.route.capacity) continue;

          const newAIds = A.locationIds.filter((id) => id !== locId);
          const newBIds = [...B.locationIds, locId];
          const newACost = costOf(A, newAIds);
          const newBCost = costOf(B, newBIds);
          const delta = newACost + newBCost - (A.cost + B.cost);

          if (delta < -EPSILON) {
            A.locationIds = newAIds;
            A.demand -= demand;
            A.cost = newACost;
            B.locationIds = newBIds;
            B.demand += demand;
            B.cost = newBCost;
            improvedAny = true;
          }
        }
      }
    }

    // --- SWAP: trocar 1 localizacao de cada rota entre si (nao-direcionado: i<j) ---
    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        const A = states[i];
        const B = states[j];

        for (const locA of [...A.locationIds]) {
          if (forcedLocationIds.has(locA)) continue;
          for (const locB of [...B.locationIds]) {
            if (forcedLocationIds.has(locB)) continue;

            const demandA = demandOf(locA);
            const demandB = demandOf(locB);
            const newADemand = A.demand - demandA + demandB;
            const newBDemand = B.demand - demandB + demandA;
            if (newADemand > A.route.capacity || newBDemand > B.route.capacity) continue;

            const newAIds = A.locationIds.map((id) => (id === locA ? locB : id));
            const newBIds = B.locationIds.map((id) => (id === locB ? locA : id));
            const newACost = costOf(A, newAIds);
            const newBCost = costOf(B, newBIds);
            const delta = newACost + newBCost - (A.cost + B.cost);

            if (delta < -EPSILON) {
              A.locationIds = newAIds;
              A.demand = newADemand;
              A.cost = newACost;
              B.locationIds = newBIds;
              B.demand = newBDemand;
              B.cost = newBCost;
              improvedAny = true;
            }
          }
        }
      }
    }
  }

  return states.map((s) => ({ routeId: s.route.id, locationIds: s.locationIds }));
}
