import { describe, expect, it, vi } from "vitest";
import { ConflictError } from "@/backend/errors/http.error";
import { PlayerRankingService } from "@/backend/services/player-ranking.service";
import { PlayerRankingCache } from "@/backend/services/player-ranking-cache";
import { PlayerRankingController } from "@/backend/controllers/player-ranking.controller";

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
      { getRankingPublicationRevision: vi.fn().mockResolvedValue(0) } as never,
      new PlayerRankingCache(),
    );

    const result = await service.getRanking(criteria);

    expect(findRankedPlayers).toHaveBeenCalledWith("version-1", criteria);
    expect(result.players[0]).toMatchObject({ rank: 3, finalScore: 0.9 });
    expect(result.pagination).toEqual({ total: 5, page: 2, limit: 2, totalPages: 3 });
  });

  it("returns zero pages for an empty ranking", async () => {
    const service = new PlayerRankingService(
      {
        findRankedPlayers: vi.fn().mockResolvedValue({ rows: [], total: 0, page: 1, limit: 20 }),
      } as never,
      {
        findActiveStrategyVersion: vi.fn().mockResolvedValue({
          id: "version-1",
          strategyCode: "INDIVIDUAL_PERFORMANCE",
          version: "1.0.0",
        }),
      } as never,
      { getRankingPublicationRevision: vi.fn().mockResolvedValue(0) } as never,
      new PlayerRankingCache(),
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
      { getRankingPublicationRevision: vi.fn().mockResolvedValue(0) } as never,
      new PlayerRankingCache(),
    );

    await expect(service.getRanking({ page: 1, limit: 20 })).rejects.toBeInstanceOf(ConflictError);
    expect(findRankedPlayers).not.toHaveBeenCalled();
  });

  it("returns the identical complete response on a hit without another ranking read", async () => {
    const findRankedPlayers = vi
      .fn()
      .mockResolvedValue({ rows: [row], total: 1, page: 1, limit: 20 });
    const findActiveStrategyVersion = vi.fn().mockResolvedValue({
      id: "version-1",
      strategyCode: "INDIVIDUAL_PERFORMANCE",
      version: "1.0.0",
    });
    const getRankingPublicationRevision = vi.fn().mockResolvedValue(5);
    const service = new PlayerRankingService(
      { findRankedPlayers } as never,
      { findActiveStrategyVersion } as never,
      { getRankingPublicationRevision } as never,
      new PlayerRankingCache(),
    );
    const first = await service.getRanking({ page: 1, limit: 20 });
    const second = await service.getRanking({ page: 1, limit: 20 });
    expect(second).toBe(first);
    expect(second).toEqual({
      strategyCode: "INDIVIDUAL_PERFORMANCE",
      strategyVersion: "1.0.0",
      players: [
        {
          rank: 1,
          player: {
            id: row.playerId,
            name: row.name,
            team: row.team,
            league: row.league,
            position: row.position,
          },
          finalScore: row.finalScore,
          quoteValue: row.quoteValue,
          unit: row.unit,
          calculatedAt: row.calculatedAt,
        },
      ],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    expect(findRankedPlayers).toHaveBeenCalledTimes(1);
    expect(findActiveStrategyVersion).toHaveBeenCalledTimes(3);
    expect(getRankingPublicationRevision).toHaveBeenCalledTimes(3);
  });

  it("stores and reuses an empty result", async () => {
    const findRankedPlayers = vi.fn().mockResolvedValue({ rows: [], total: 0, page: 1, limit: 20 });
    const service = new PlayerRankingService(
      { findRankedPlayers } as never,
      {
        findActiveStrategyVersion: vi
          .fn()
          .mockResolvedValue({ id: "v", strategyCode: "S", version: "1" }),
      } as never,
      { getRankingPublicationRevision: vi.fn().mockResolvedValue(0) } as never,
      new PlayerRankingCache(),
    );
    expect((await service.getRanking({ page: 1, limit: 20 })).players).toEqual([]);
    expect((await service.getRanking({ page: 1, limit: 20 })).players).toEqual([]);
    expect(findRankedPlayers).toHaveBeenCalledTimes(1);
  });

  it("uses normalized defaults and team text for cache identity", async () => {
    const findRankedPlayers = vi.fn().mockImplementation(async (_version, query) => ({
      rows: [row],
      total: 1,
      page: query.page,
      limit: query.limit,
    }));
    const service = new PlayerRankingService(
      { findRankedPlayers } as never,
      {
        findActiveStrategyVersion: vi
          .fn()
          .mockResolvedValue({ id: "v", strategyCode: "S", version: "1" }),
      } as never,
      { getRankingPublicationRevision: vi.fn().mockResolvedValue(0) } as never,
      new PlayerRankingCache(),
    );
    const controller = new PlayerRankingController(service);
    await controller.getRanking({ team: " Example " });
    await controller.getRanking({ team: "Example", page: "1", limit: "20" });
    expect(findRankedPlayers).toHaveBeenCalledTimes(1);
    await controller.getRanking({ team: "example" });
    await controller.getRanking({ team: "Example", page: "2" });
    await controller.getRanking({ team: "Example", limit: "10" });
    expect(findRankedPlayers).toHaveBeenCalledTimes(4);
  });

  it("retries a changed publication once and caches only the fresh result", async () => {
    const fresh = { ...row, finalScore: 0.99, quoteValue: 99 };
    const findRankedPlayers = vi
      .fn()
      .mockResolvedValueOnce({ rows: [row], total: 1, page: 1, limit: 20 })
      .mockResolvedValueOnce({ rows: [fresh], total: 1, page: 1, limit: 20 });
    const getRankingPublicationRevision = vi
      .fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValue(2);
    const service = new PlayerRankingService(
      { findRankedPlayers } as never,
      {
        findActiveStrategyVersion: vi
          .fn()
          .mockResolvedValue({ id: "v", strategyCode: "S", version: "1" }),
      } as never,
      { getRankingPublicationRevision } as never,
      new PlayerRankingCache(),
    );
    expect((await service.getRanking({ page: 1, limit: 20 })).players[0].quoteValue).toBe(99);
    expect((await service.getRanking({ page: 1, limit: 20 })).players[0].quoteValue).toBe(99);
    expect(findRankedPlayers).toHaveBeenCalledTimes(2);
  });

  it("retries when the active version changes during a read", async () => {
    const findRankedPlayers = vi
      .fn()
      .mockResolvedValue({ rows: [row], total: 1, page: 1, limit: 20 });
    const findActiveStrategyVersion = vi
      .fn()
      .mockResolvedValueOnce({ id: "old", strategyCode: "S", version: "1" })
      .mockResolvedValue({ id: "new", strategyCode: "S", version: "2" });
    const service = new PlayerRankingService(
      { findRankedPlayers } as never,
      { findActiveStrategyVersion } as never,
      { getRankingPublicationRevision: vi.fn().mockResolvedValue(0) } as never,
      new PlayerRankingCache(),
    );
    expect((await service.getRanking({ page: 1, limit: 20 })).strategyVersion).toBe("2");
    expect(findRankedPlayers.mock.calls.map((call) => call[0])).toEqual(["old", "new"]);
  });

  it("returns a second changing result without storing it", async () => {
    const findRankedPlayers = vi
      .fn()
      .mockResolvedValue({ rows: [row], total: 1, page: 1, limit: 20 });
    const getRankingPublicationRevision = vi
      .fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValue(3);
    const service = new PlayerRankingService(
      { findRankedPlayers } as never,
      {
        findActiveStrategyVersion: vi
          .fn()
          .mockResolvedValue({ id: "v", strategyCode: "S", version: "1" }),
      } as never,
      { getRankingPublicationRevision } as never,
      new PlayerRankingCache(),
    );
    expect((await service.getRanking({ page: 1, limit: 20 })).players).toHaveLength(1);
    await service.getRanking({ page: 1, limit: 20 });
    expect(findRankedPlayers).toHaveBeenCalledTimes(3);
  });

  it.each(["version", "revision", "rows"] as const)(
    "does not serve or store an error from %s reading",
    async (source) => {
      const findRankedPlayers = vi
        .fn()
        .mockResolvedValue({ rows: [row], total: 1, page: 1, limit: 20 });
      const findActiveStrategyVersion = vi
        .fn()
        .mockResolvedValue({ id: "v", strategyCode: "S", version: "1" });
      const getRankingPublicationRevision = vi.fn().mockResolvedValue(0);
      const service = new PlayerRankingService(
        { findRankedPlayers } as never,
        { findActiveStrategyVersion } as never,
        { getRankingPublicationRevision } as never,
        new PlayerRankingCache(),
      );
      await service.getRanking({ page: 1, limit: 20 });
      if (source === "version")
        findActiveStrategyVersion.mockRejectedValueOnce(new Error("version down"));
      if (source === "revision")
        getRankingPublicationRevision.mockRejectedValueOnce(new Error("revision down"));
      if (source === "rows") {
        getRankingPublicationRevision.mockResolvedValueOnce(1);
        findRankedPlayers.mockRejectedValueOnce(new Error("rows down"));
      }
      await expect(service.getRanking({ page: 1, limit: 20 })).rejects.toThrow("down");
      if (source === "rows") getRankingPublicationRevision.mockResolvedValue(1);
      await service.getRanking({ page: 1, limit: 20 });
      expect(findRankedPlayers).toHaveBeenCalledTimes(source === "rows" ? 3 : 1);
    },
  );

  it("does not cache a response when the post-read revision check fails", async () => {
    const findRankedPlayers = vi
      .fn()
      .mockResolvedValue({ rows: [row], total: 1, page: 1, limit: 20 });
    const getRankingPublicationRevision = vi
      .fn()
      .mockResolvedValueOnce(1)
      .mockRejectedValueOnce(new Error("revision unavailable"))
      .mockResolvedValue(1);
    const service = new PlayerRankingService(
      { findRankedPlayers } as never,
      {
        findActiveStrategyVersion: vi
          .fn()
          .mockResolvedValue({ id: "v", strategyCode: "S", version: "1" }),
      } as never,
      { getRankingPublicationRevision } as never,
      new PlayerRankingCache(),
    );
    await expect(service.getRanking({ page: 1, limit: 20 })).rejects.toThrow(
      "revision unavailable",
    );
    await service.getRanking({ page: 1, limit: 20 });
    expect(findRankedPlayers).toHaveBeenCalledTimes(2);
  });
});
