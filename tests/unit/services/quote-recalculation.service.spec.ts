import { describe, expect, it, vi } from "vitest";
import { League, Position } from "@/backend/models/enums";
import { Player } from "@/backend/models/Player";
import { ConflictError } from "@/backend/errors/http.error";
import { QuoteRecalculationService } from "@/backend/services/quote-recalculation.service";

const player = new Player({
  id: "player-1",
  name: "Player One",
  team: "Example FC",
  league: League.PREMIER_LEAGUE,
  position: Position.FORWARD,
  statistics: { rating: 7 },
});

const activeVersion = {
  id: "version-1",
  strategyCode: "INDIVIDUAL_PERFORMANCE",
  version: "1.0.0",
  configuration: {},
};

const result = {
  individualScore: 0.7,
  teamScore: null,
  finalScore: 0.7,
  quoteValue: 70.3,
  explanation: { strategyCode: "INDIVIDUAL_PERFORMANCE" },
};

function dependencies() {
  return {
    valuationRepository: {
      findActiveStrategyVersion: vi.fn().mockResolvedValue(activeVersion),
      saveQuote: vi.fn().mockResolvedValue({ id: "quote-1" }),
    },
    playerRepository: {
      findAllForRecalculation: vi.fn().mockResolvedValue({ players: [player], errors: [] }),
    },
    contextRepository: { findTeamContext: vi.fn() },
    engine: { calculate: vi.fn().mockReturnValue(result) },
  };
}

describe("QuoteRecalculationService", () => {
  it("rejects recalculation when no strategy is active", async () => {
    const deps = dependencies();
    deps.valuationRepository.findActiveStrategyVersion.mockResolvedValue(null);

    await expect(new QuoteRecalculationService(
      deps.valuationRepository as never,
      deps.playerRepository as never,
      deps.contextRepository as never,
      deps.engine as never,
    ).recalculate()).rejects.toBeInstanceOf(ConflictError);
  });

  it("calculates and persists one quote per successful player", async () => {
    const deps = dependencies();
    const response = await new QuoteRecalculationService(
      deps.valuationRepository as never,
      deps.playerRepository as never,
      deps.contextRepository as never,
      deps.engine as never,
    ).recalculate();

    expect(response).toMatchObject({ status: "COMPLETED", calculated: 1, rejected: 0 });
    expect(deps.engine.calculate).toHaveBeenCalledWith(
      player,
      "INDIVIDUAL_PERFORMANCE",
      {},
      undefined,
      "1.0.0",
    );
    expect(deps.valuationRepository.saveQuote).toHaveBeenCalledWith(expect.objectContaining({
      playerId: player.id,
      strategyVersionId: activeVersion.id,
      quoteValue: 70.3,
    }));
  });

  it("publishes valid quotes and reports player-level failures", async () => {
    const deps = dependencies();
    const secondPlayer = new Player({ ...player, id: "player-2", name: "Player Two" });
    deps.playerRepository.findAllForRecalculation.mockResolvedValue({
      players: [player, secondPlayer],
      errors: [],
    });
    deps.engine.calculate
      .mockReturnValueOnce(result)
      .mockImplementationOnce(() => { throw new Error("insufficient data"); });

    const response = await new QuoteRecalculationService(
      deps.valuationRepository as never,
      deps.playerRepository as never,
      deps.contextRepository as never,
      deps.engine as never,
    ).recalculate();

    expect(response).toMatchObject({ status: "PARTIAL", calculated: 1, rejected: 1 });
    expect(response.errors).toEqual([{ playerId: "player-2", error: "insufficient data" }]);
    expect(deps.valuationRepository.saveQuote).toHaveBeenCalledTimes(1);
  });

  it("continues when a player cannot be loaded for recalculation", async () => {
    const deps = dependencies();
    deps.playerRepository.findAllForRecalculation.mockResolvedValue({
      players: [player],
      errors: [{ playerId: "invalid-player", error: "Unsupported player statistic: legacy_metric" }],
    });

    const response = await new QuoteRecalculationService(
      deps.valuationRepository as never,
      deps.playerRepository as never,
      deps.contextRepository as never,
      deps.engine as never,
    ).recalculate();

    expect(response).toMatchObject({ status: "PARTIAL", calculated: 1, rejected: 1 });
    expect(response.errors).toEqual([{
      playerId: "invalid-player",
      error: "Unsupported player statistic: legacy_metric",
    }]);
  });
});
