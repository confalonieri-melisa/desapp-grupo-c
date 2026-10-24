import { describe, expect, it, vi } from "vitest";
import { PlayerQuotesController } from "@/backend/controllers/player-quotes.controller";

describe("PlayerQuotesController", () => {
  it("maps a persisted quote snapshot to the public response", async () => {
    const snapshot = {
      id: "quote-1",
      playerId: "player-1",
      individualScore: 0.81,
      teamScore: 0.74,
      finalScore: 0.81,
      quoteValue: 80.2,
      unit: "CREDIT_PER_TOKEN",
      calculatedAt: new Date("2026-10-20T18:30:00.000Z"),
      strategyCode: "INDIVIDUAL_PERFORMANCE" as const,
      strategyVersion: "1.0.0",
      explanation: {
        strategyCode: "INDIVIDUAL_PERFORMANCE" as const,
        version: "1.0.0",
        individual: [],
        team: [],
        missingMetrics: [],
        effectivePolicy: "NONE",
        degraded: false,
      },
    };
    const getQuotes = vi.fn().mockResolvedValue([snapshot]);
    const controller = new PlayerQuotesController({ getQuotes } as never);

    await expect(controller.getQuotes("player-1")).resolves.toEqual({
      items: [{
        playerId: "player-1",
        quoteValue: 80.2,
        unit: "CREDIT_PER_TOKEN",
        calculatedAt: snapshot.calculatedAt,
        strategyCode: "INDIVIDUAL_PERFORMANCE",
        strategyVersion: "1.0.0",
        score: {
          individualScore: 0.81,
          teamScore: 0.74,
          finalScore: 0.81,
          components: snapshot.explanation,
        },
      }],
    });
    expect(getQuotes).toHaveBeenCalledWith("player-1", undefined);
  });
});
