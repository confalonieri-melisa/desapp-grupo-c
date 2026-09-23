import { describe, expect, it, vi } from "vitest";
import { PlayerService } from "@/services/player.service";
import { League, Position } from "@/models/enums";
import type {
  PlayerRepository,
} from "@/repositories/player.repository";
import { NotFoundError } from "@/errors/http.error";

describe("PlayerService", () => {
  const player = {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Kylian Mbappé",
    team: "Real Madrid",
    league: League.LA_LIGA,
    position: Position.FORWARD,
    statistics: { goals: 10 },
  };

  it("catalogs players with default pagination and normalized filters", async () => {
    const repository = {
      findMany: vi.fn().mockResolvedValue({
        data: [player],
        total: 1,
      }),
    } as unknown as PlayerRepository;
    const service = new PlayerService(repository);

    await expect(
      service.catalog({
        league: League.LA_LIGA,
        team: "  Real Madrid  ",
        position: Position.FORWARD,
      }),
    ).resolves.toEqual({
      players: [player],
      total: 1,
      page: 1,
      limit: 20,
    });

    expect(repository.findMany).toHaveBeenCalledWith(
      {
        league: League.LA_LIGA,
        team: "Real Madrid",
        position: Position.FORWARD,
      },
      { page: 1, limit: 20 },
    );
  });

  it("catalogs players with explicit pagination", async () => {
    const repository = { findMany: vi.fn().mockResolvedValue({ data: [], total: 25 }) } as unknown as PlayerRepository;
    const service = new PlayerService(repository);

    await expect(
      service.catalog({ page: 2, limit: 10 }),
    ).resolves.toEqual({
      players: [],
      total: 25,
      page: 2,
      limit: 10,
    });
  });

  it("returns a player by id", async () => {
    const repository = { findById: vi.fn().mockResolvedValue(player) } as unknown as PlayerRepository;
    const service = new PlayerService(repository);

    await expect(service.getById(player.id)).resolves.toBe(player);
  });

  it("raises not found when a player does not exist", async () => {
    const repository = { findById: vi.fn().mockResolvedValue(null) } as unknown as PlayerRepository;
    const service = new PlayerService(repository);

    await expect(service.getById(player.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
