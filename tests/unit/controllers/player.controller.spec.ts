import { describe, expect, it, vi } from "vitest";
import { PlayerController } from "@/controllers/player.controller";
import { League, Position } from "@/models/enums";
import type { Player } from "@/models/Player";
import type { PlayerService } from "@/services/player.service";

const player = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Kylian Mbappé",
  team: "Real Madrid",
  league: League.LA_LIGA,
  position: Position.FORWARD,
  statistics: { goals: 10 },
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
} as Player;

describe("PlayerController", () => {
  it("formats a player detail returned by the service", async () => {
    const service = {
      getById: vi.fn().mockResolvedValue(player),
    } as unknown as PlayerService;

    await expect(
      new PlayerController(service).getById(player.id),
    ).resolves.toEqual({
      id: player.id,
      name: player.name,
      team: player.team,
      league: player.league,
      position: player.position,
      statistics: player.statistics,
      currentQuote: 1,
      totalTokens: 100,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt,
    });
    expect(service.getById).toHaveBeenCalledWith(player.id);
  });

  it("validates catalog query params and formats pagination", async () => {
    const service = {
      catalog: vi.fn().mockResolvedValue({
        players: [player],
        total: 21,
        page: 2,
        limit: 20,
      }),
    } as unknown as PlayerService;

    await expect(
      new PlayerController(service).getPlayers({
        league: League.LA_LIGA,
        page: "2",
        limit: "20",
      }),
    ).resolves.toMatchObject({
      data: [{
        id: player.id,
        statistics: player.statistics,
        currentQuote: 1,
        totalTokens: 100,
      }],
      pagination: { total: 21, page: 2, limit: 20, totalPages: 2 },
    });
    expect(service.catalog).toHaveBeenCalledWith({
      league: League.LA_LIGA,
      page: 2,
      limit: 20,
    });
  });

});
