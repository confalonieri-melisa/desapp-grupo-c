import { describe, expect, it, vi } from "vitest";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";

describe("ValuationRepository append-only quotes", () => {
  it("inserts two quotes for the same player without relying on timestamp uniqueness", async () => {
    const insert = vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: crypto.randomUUID() }]),
      })),
    }));
    const repository = new ValuationRepository({ insert } as never);
    const quote = {
      playerId: "player",
      strategyVersionId: "version",
      individualScore: 0.5,
      teamScore: null,
      finalScore: 0.5,
      quoteValue: 50.5,
      explanation: {},
    };

    await repository.saveQuote(quote);
    await repository.saveQuote(quote);

    expect(insert).toHaveBeenCalledTimes(2);
  });
});
