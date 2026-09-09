import { describe, expect, it } from "vitest";
import { sweepCluster } from "../src/services/clustering";

describe("sweepCluster", () => {
  it("nao gera nenhum cluster com capacidade excedida (demand somado <= capacidade em cada um)", () => {
    // 8 localizacoes ao redor de um centro, demand=1 cada, capacidade 3
    const locations = Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * 2 * Math.PI;
      return {
        id: `L${i}`,
        lat: Math.sin(angle) * 0.1,
        lng: Math.cos(angle) * 0.1,
        demand: 1,
      };
    });

    const clusters = sweepCluster(locations, 3);

    // 8 localizacoes / capacidade 3 -> pelo menos 3 clusters (ceil(8/3)=3)
    expect(clusters.length).toBeGreaterThanOrEqual(3);
    for (const cluster of clusters) {
      const totalDemand = cluster.locationIds.length; // demand=1 cada
      expect(totalDemand).toBeLessThanOrEqual(3);
    }
    // todas as localizacoes aparecem em algum cluster, sem duplicar
    const allIds = clusters.flatMap((c) => c.locationIds).sort();
    expect(allIds).toEqual(locations.map((l) => l.id).sort());
  });

  it("respeita demandas diferentes de 1 ao empacotar", () => {
    const locations = [
      { id: "A", lat: 0, lng: 0, demand: 2 },
      { id: "B", lat: 0.001, lng: 0.001, demand: 2 },
      { id: "C", lat: 0.002, lng: 0.002, demand: 1 },
    ];
    const clusters = sweepCluster(locations, 3);

    for (const cluster of clusters) {
      const demand = cluster.locationIds.reduce((sum, id) => {
        const loc = locations.find((l) => l.id === id)!;
        return sum + loc.demand;
      }, 0);
      expect(demand).toBeLessThanOrEqual(3);
    }
  });

  it("retorna vazio para lista vazia", () => {
    expect(sweepCluster([], 4)).toEqual([]);
  });
});
