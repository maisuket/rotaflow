import { describe, expect, it } from "vitest";
import { isRouteActiveOnWeekday } from "../src/utils/recurrence";

describe("isRouteActiveOnWeekday", () => {
  it("roda todo dia quando activeWeekdays e null", () => {
    const route = { activeWeekdays: null };
    for (let day = 0; day <= 6; day++) {
      expect(isRouteActiveOnWeekday(route, day)).toBe(true);
    }
  });

  it("roda todo dia quando activeWeekdays e uma lista vazia", () => {
    const route = { activeWeekdays: [] };
    expect(isRouteActiveOnWeekday(route, 0)).toBe(true);
    expect(isRouteActiveOnWeekday(route, 3)).toBe(true);
  });

  it("so roda nos dias configurados (ex: seg-sex)", () => {
    const route = { activeWeekdays: [1, 2, 3, 4, 5] };
    expect(isRouteActiveOnWeekday(route, 0)).toBe(false); // domingo
    expect(isRouteActiveOnWeekday(route, 1)).toBe(true); // segunda
    expect(isRouteActiveOnWeekday(route, 5)).toBe(true); // sexta
    expect(isRouteActiveOnWeekday(route, 6)).toBe(false); // sabado
  });
});
