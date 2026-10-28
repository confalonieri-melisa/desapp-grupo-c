import { describe, expect, it } from "vitest";
import { derivePortfolioSummary } from "@/frontend/features/portfolio/portfolio";
import type { PortfolioItem } from "@/frontend/services/client/player-trading.service";

const item = (value: number | null, pnl: number | null): PortfolioItem => ({
  playerId: crypto.randomUUID(), quantity: 1, averagePurchasePrice: 10,
  currentQuoteValue: value, currentValue: value, unrealizedPnl: pnl,
});

describe("portfolio totals", () => {
  it("keeps zero totals for an empty portfolio and adds the balance to net worth", () => {
    expect(derivePortfolioSummary({ creditBalance: 0, items: [] })).toEqual({
      holdingsValue: { value: 0, excludedCount: 0, status: "complete" },
      unrealizedTotal: { value: 0, excludedCount: 0, status: "complete" },
      estimatedWorth: { value: 0, excludedCount: 0, status: "complete" },
    });
    expect(derivePortfolioSummary({ creditBalance: 25, items: [] }).estimatedWorth.value).toBe(25);
  });

  it("includes zero and negative results while reporting partial sums separately", () => {
    const result = derivePortfolioSummary({ creditBalance: 0, items: [item(0, 0), item(20, -5), item(null, null)] });
    expect(result.holdingsValue).toEqual({ value: 20, excludedCount: 1, status: "partial" });
    expect(result.unrealizedTotal).toEqual({ value: -5, excludedCount: 1, status: "partial" });
    expect(result.estimatedWorth).toEqual({ value: 20, excludedCount: 1, status: "partial" });
  });

  it("does not turn missing values into a known zero", () => {
    const result = derivePortfolioSummary({ creditBalance: 100, items: [item(null, null)] });
    expect(result.holdingsValue).toEqual({ value: null, excludedCount: 1, status: "unavailable" });
    expect(result.unrealizedTotal).toEqual({ value: null, excludedCount: 1, status: "unavailable" });
    expect(result.estimatedWorth).toEqual({ value: null, excludedCount: 1, status: "unavailable" });
  });

  it("tracks missing value and missing result independently", () => {
    const result = derivePortfolioSummary({ creditBalance: 4, items: [item(7, null), item(null, 2)] });
    expect(result.holdingsValue).toEqual({ value: 7, excludedCount: 1, status: "partial" });
    expect(result.unrealizedTotal).toEqual({ value: 2, excludedCount: 1, status: "partial" });
    expect(result.estimatedWorth.value).toBe(11);
  });
});
