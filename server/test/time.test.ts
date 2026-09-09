import { describe, expect, it } from "vitest";
import { timeStringToSeconds } from "../src/utils/time";

describe("timeStringToSeconds", () => {
  it("converte HH:MM valido", () => {
    expect(timeStringToSeconds("00:00")).toBe(0);
    expect(timeStringToSeconds("07:30")).toBe(7 * 3600 + 30 * 60);
    expect(timeStringToSeconds("23:59")).toBe(23 * 3600 + 59 * 60);
  });

  it("retorna null para valores ausentes ou invalidos", () => {
    expect(timeStringToSeconds(null)).toBeNull();
    expect(timeStringToSeconds(undefined)).toBeNull();
    expect(timeStringToSeconds("")).toBeNull();
    expect(timeStringToSeconds("24:00")).toBeNull();
    expect(timeStringToSeconds("7:30")).toBeNull();
    expect(timeStringToSeconds("abc")).toBeNull();
  });
});
