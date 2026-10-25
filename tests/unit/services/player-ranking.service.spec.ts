import { describe, expect, it, vi } from "vitest";
import { ConflictError } from "@/backend/errors/http.error";
import { PlayerRankingService } from "@/backend/services/player-ranking.service";

const criteria = { page: 2, limit: 2 } as const;

const row = {
  playerId: "player-1",
  name: "Player One",
  team: "Example FC",
  league: "PREMIER_LEAGUE" as const,
  position: "FORWARD" as const,
  finalScore: 0.9,
  quoteValue: 90,
  unit: "CREDIT_PER_TOKEN",
  calculatedAt: new Date("2026-10-24T15:00:00.000Z"),
};

describe("PlayerRankingService", () => {
  it("uses the captured active version and assigns a global rank", async () => {
    const findRankedPlayers = vi.fn().mockResolvedValue({
      rows: [row],
      total: 5,
      page: 2,
      limit: 2,
    });
    const findActiveStrategyVersion = vi.fn().mockResolvedValue({
      id: "version-1",
      strategyCode: "INDIVIDUAL_PERFORMANCE",
      version: "1.0.0",
    });
    const service = new PlayerRankingService(
      { findRankedPlayers } as never,
      { findActiveStrategyVersion } as never,
    );

    const result = await service.getRanking(criteria);

    expect(findRankedPlayers).toHaveBeenCalledWith("version-1", criteria);
    expect(result.players[0]).toMatchObject({ rank: 3, finalScore: 0.9 });
    expect(result.pagination).toEqual({ total: 5, page: 2, limit: 2, totalPages: 3 });
  });

  it("returns zero pages for an empty ranking", async () => {
    const service = new PlayerRankingService(
      { findRankedPlayers: vi.fn().mockResolvedValue({ rows: [], total: 0, page: 1, limit: 20 }) } as never,
      { findActiveStrategyVersion: vi.fn().mockResolvedValue({
        id: "version-1",
        strategyCode: "INDIVIDUAL_PERFORMANCE",
        version: "1.0.0",
      }) } as never,
    );

    await expect(service.getRanking({ page: 1, limit: 20 })).resolves.toMatchObject({
      players: [],
      pagination: { total: 0, totalPages: 0 },
    });
  });

  it("rejects the request when there is no active strategy", async () => {
    const findRankedPlayers = vi.fn();
    const service = new PlayerRankingService(
      { findRankedPlayers } as never,
      { findActiveStrategyVersion: vi.fn().mockResolvedValue(null) } as never,
    );

    await expect(service.getRanking({ page: 1, limit: 20 })).rejects.toBeInstanceOf(ConflictError);
    expect(findRankedPlayers).not.toHaveBeenCalled();
  });
});
