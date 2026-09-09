import { describe, expect, it } from "vitest";
import { formatDateTime } from "../src/utils/format";

describe("formatDateTime", () => {
  it("formata no padrao DD/MM/AAAA HH:MM", () => {
    const result = formatDateTime("2026-09-09T14:19:31.000Z");
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });

  it("datas diferentes produzem strings diferentes", () => {
    const a = formatDateTime("2026-01-01T00:00:00.000Z");
    const b = formatDateTime("2026-06-15T12:30:00.000Z");
    expect(a).not.toBe(b);
  });
});
