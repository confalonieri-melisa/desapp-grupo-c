import { describe, expect, it } from "vitest";
import { formatQuoteValue, formatQuoteTimestamp, isValidQuoteDate, formatScore, projectComponents } from "@/frontend/features/profile/utils/player-quotes";

describe("quote presentation", () => {
  it("preserves names, nesting, nulls, arrays, empty collections, zero and false", () => {
    expect(projectComponents({ zero: 0, enabled: false, missing: null, nested: ["<script>", { score: 0 }], empty: {} })).toEqual({
      kind: "object", entries: [
        { name: "zero", node: { kind: "value", value: "0" } },
        { name: "enabled", node: { kind: "value", value: "false" } },
        { name: "missing", node: { kind: "value", value: "No disponible" } },
        { name: "nested", node: { kind: "array", entries: [
          { name: "[0]", node: { kind: "value", value: "<script>" } },
          { name: "[1]", node: { kind: "object", entries: [{ name: "score", node: { kind: "value", value: "0" } }] } },
        ] } },
        { name: "empty", node: { kind: "object", entries: [] } },
      ],
    });
  });
  it("keeps absent scores distinct from zero without deriving other values", () => {
    expect(formatScore(0)).toBe("0"); expect(formatScore(0.123456789)).toBe("0.123456789");
    expect(formatScore(null)).toBe("No disponible"); expect(formatScore(undefined)).toBe("No disponible");
    expect(projectComponents(undefined)).toEqual({ kind: "value", value: "No disponible" });
    expect(projectComponents([])).toEqual({ kind: "array", entries: [] });
    expect(projectComponents("")).toEqual({ kind: "value", value: '""' });
  });
  it.each(["2028-02-29", "2026-12-31", "2030-01-01", "0100-01-01", "9999-12-31"])("accepts real calendar date %s including future", (date) => {
    expect(isValidQuoteDate(date)).toBe(true);
  });
  it.each(["", "2026-02-29", "2026-02-30", "2026-04-31", "2026-13-01", "2026-00-01", "2026-01-00", "2026-1-01", " 2026-10-20", "0000-01-01", "0099-12-31"])("rejects %s consistently with backend", (date) => {
    expect(isValidQuoteDate(date)).toBe(false);
  });
  it("preserves zero and numeric precision without percentage conversion", () => {
    expect(formatQuoteValue(0)).toBe("0 créditos por token");
    expect(formatQuoteValue(12.3456789)).toBe("12.3456789 créditos por token");
  });
  it("keeps seconds, all received fractional digits and explicit UTC", () => {
    expect(formatQuoteTimestamp("2026-10-20T10:02:03.123456Z")).toBe("2026-10-20 10:02:03.123456 UTC");
    expect(formatQuoteTimestamp("2026-10-20T10:02:03Z")).toBe("2026-10-20 10:02:03 UTC");
  });
});
