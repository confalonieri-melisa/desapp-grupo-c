import { describe, expect, it, vi } from "vitest";
import { PlayerRankingController } from "@/backend/controllers/player-ranking.controller";

describe("PlayerRankingController", () => {
  it("validates the query and delegates the ranking request", async () => {
    const getRanking = vi.fn().mockResolvedValue({
      strategyCode: "INDIVIDUAL_PERFORMANCE",
      strategyVersion: "1.0.0",
      players: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    const controller = new PlayerRankingController({ getRanking } as never);

    const result = await controller.getRanking({ team: " Arsenal " });

    expect(getRanking).toHaveBeenCalledWith({ team: "Arsenal", page: 1, limit: 20 });
    expect(result.pagination.totalPages).toBe(0);
  });

  it("rejects unknown query parameters before reaching the service", async () => {
    const getRanking = vi.fn();
    const controller = new PlayerRankingController({ getRanking } as never);

    await expect(controller.getRanking({ sort: "score" })).rejects.toThrow();
    expect(getRanking).not.toHaveBeenCalled();
  });

  it("rejects out-of-range pagination before reaching the service", async () => {
    const getRanking = vi.fn();
    const controller = new PlayerRankingController({ getRanking } as never);

    await expect(controller.getRanking({ page: "0" })).rejects.toThrow();
    expect(getRanking).not.toHaveBeenCalled();
  });
});
