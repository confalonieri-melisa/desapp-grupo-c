import { describe, expect, it } from "vitest";
import { formatQuoteValue, formatQuoteTimestamp, formatQuoteValueDisplay, formatQuoteTimestampDisplay, formatQuoteDate, formatStrategy, isDemoQuote, isValidQuoteDate, formatScore } from "@/frontend/features/profile/utils/player-quotes";

describe("quote presentation", () => {
  it("keeps absent scores distinct from zero without deriving other values", () => {
    expect(formatScore(0)).toBe("0"); expect(formatScore(0.123456789)).toBe("0.123456789");
    expect(formatScore(null)).toBe("No disponible"); expect(formatScore(undefined)).toBe("No disponible");
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
  it("presents the value and effective timestamp without seconds or zone in the visible label", () => {
    expect(formatQuoteValueDisplay(12.3456789)).toBe("12,3456789");
    expect(formatQuoteTimestampDisplay("2026-10-20T10:02:03.123456Z")).toContain("10:02");
    expect(formatQuoteTimestampDisplay("2026-10-20T10:02:03.123456Z")).not.toMatch(/:03|UTC|\.123456/);
    expect(formatQuoteDate("2026-10-20")).toContain("20 de octubre de 2026");
    expect(formatStrategy("INDIVIDUAL_PLUS_TEAM_CONTEXT")).toBe("Rendimiento y contexto del equipo");
  });
  it("keeps invalid timestamps and dates readable and labels known and unknown strategies", () => {
    expect(formatQuoteTimestampDisplay("invalid")).toBe("invalid");
    expect(formatQuoteDate("2026-02-30")).toBe("2026-02-30");
    expect(formatStrategy("INDIVIDUAL_PERFORMANCE")).toBe("Rendimiento individual");
    expect(formatStrategy("CUSTOM_STRATEGY")).toBe("CUSTOM STRATEGY");
  });
  it("identifies fixture quotes without labeling real ones as test data", () => {
    expect(isDemoQuote({ demoFixture: "demo-quote-history-v1" })).toBe(true);
    expect(isDemoQuote({ individual: [] })).toBe(false);
    expect(isDemoQuote(null)).toBe(false);
  });
});
