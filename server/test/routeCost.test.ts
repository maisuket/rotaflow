import { describe, expect, it } from "vitest";
import { computeArrivalByPointIndex } from "../src/services/routeCost";

describe("computeArrivalByPointIndex", () => {
  it("acumula a duracao de cada trecho a partir do horario de partida", () => {
    // tour: 0 -> 1 -> 2 -> 3, cada trecho leva 600s (10min)
    const durationSeconds = [
      [0, 600, 1200, 1800],
      [600, 0, 600, 1200],
      [1200, 600, 0, 600],
      [1800, 1200, 600, 0],
    ];
    const departure = 7 * 3600; // 07:00

    const arrivals = computeArrivalByPointIndex([0, 1, 2, 3], durationSeconds, departure);

    expect(arrivals.get(0)).toBe(departure); // origem: chegada = partida
    expect(arrivals.get(1)).toBe(departure + 600);
    expect(arrivals.get(2)).toBe(departure + 1200);
    expect(arrivals.get(3)).toBe(departure + 1800);
  });

  it("funciona com um tour de um unico ponto", () => {
    const arrivals = computeArrivalByPointIndex([0], [[0]], 1000);
    expect(arrivals.get(0)).toBe(1000);
  });

  it("aplica speedFactor multiplicando cada trecho (veiculo mais lento)", () => {
    const durationSeconds = [
      [0, 600, 1200],
      [600, 0, 600],
      [1200, 600, 0],
    ];
    const departure = 7 * 3600;

    const arrivals = computeArrivalByPointIndex([0, 1, 2], durationSeconds, departure, 1.5);

    expect(arrivals.get(0)).toBe(departure);
    expect(arrivals.get(1)).toBe(departure + 600 * 1.5);
    expect(arrivals.get(2)).toBe(departure + 600 * 1.5 + 600 * 1.5);
  });

  it("speedFactor default (nao informado) equivale a 1x, sem mudar o resultado", () => {
    const durationSeconds = [
      [0, 600],
      [600, 0],
    ];
    const departure = 1000;
    const arrivals = computeArrivalByPointIndex([0, 1], durationSeconds, departure);
    expect(arrivals.get(1)).toBe(departure + 600);
  });
});
