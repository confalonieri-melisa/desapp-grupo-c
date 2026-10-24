import { describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/backend/errors/http.error";
import { Player } from "@/backend/models/Player";
import { League, Position } from "@/backend/models/enums";
import { PlayerQuotesService } from "@/backend/services/player-quotes.service";

const player = new Player({
  id: "player-1",
  name: "Player One",
  team: "Example FC",
  league: League.PREMIER_LEAGUE,
  position: Position.FORWARD,
  statistics: { goals: 2 },
});

const row = {
  quote: {
    id: "quote-1",
    playerId: player.id,
    quoteValue: "82.50",
    calculatedAt: new Date("2026-10-20T18:30:00.000Z"),
    individualScore: "0.81",
    teamScore: null,
    finalScore: "0.81",
    unit: "CREDIT_PER_TOKEN",
    explanation: { individual: [], team: [] },
  },
  strategyCode: "INDIVIDUAL_PERFORMANCE",
  strategyVersion: "1.0.0",
};

function dependencies() {
  return {
    playerRepository: { findById: vi.fn().mockResolvedValue(player) },
    valuationRepository: {
      findHistoryByPlayerId: vi.fn().mockResolvedValue([row]),
      findLatestQuoteBefore: vi.fn().mockResolvedValue(row),
    },
  };
}

describe("PlayerQuotesService", () => {
  it("returns the complete history for an existing player", async () => {
    const deps = dependencies();
    const result = await new PlayerQuotesService(deps.playerRepository as never, deps.valuationRepository as never).getQuotes(player.id);

    expect(result).toEqual([row]);
    expect(deps.valuationRepository.findHistoryByPlayerId).toHaveBeenCalledWith(player.id);
    expect(deps.valuationRepository.findLatestQuoteBefore).not.toHaveBeenCalled();
  });

  it("returns an empty history without treating it as an error", async () => {
    const deps = dependencies();
    deps.valuationRepository.findHistoryByPlayerId.mockResolvedValue([]);

    await expect(new PlayerQuotesService(deps.playerRepository as never, deps.valuationRepository as never).getQuotes(player.id)).resolves.toEqual([]);
  });

  it("rejects an unknown player before querying quotes", async () => {
    const deps = dependencies();
    deps.playerRepository.findById.mockResolvedValue(null);

    await expect(new PlayerQuotesService(deps.playerRepository as never, deps.valuationRepository as never).getQuotes(player.id)).rejects.toMatchObject({
      message: "Player not found",
      status: 404,
    });
    expect(deps.valuationRepository.findHistoryByPlayerId).not.toHaveBeenCalled();
  });

  it("selects the persisted quote on or before the requested date", async () => {
    const deps = dependencies();
    const service = new PlayerQuotesService(deps.playerRepository as never, deps.valuationRepository as never);

    await expect(service.getQuotes(player.id, "2026-10-20")).resolves.toEqual([row]);

    expect(deps.valuationRepository.findLatestQuoteBefore)
      .toHaveBeenCalledWith(player.id, new Date("2026-10-21T00:00:00.000Z"));
  });

  it("rejects a date with no available quote", async () => {
    const deps = dependencies();
    deps.valuationRepository.findLatestQuoteBefore.mockResolvedValue(null);

    await expect(new PlayerQuotesService(deps.playerRepository as never, deps.valuationRepository as never).getQuotes(player.id, "2026-10-20")).rejects.toBeInstanceOf(NotFoundError);
  });
});
