import { describe, expect, it, vi } from "vitest";
import { PlayerService } from "@/services/player.service";
import { League, Position } from "@/models/enums";
import type { PlayerDataSource } from "@/adapters/player-data-source";
import type {
  PlayerPersistenceData,
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

  it("transforms scraped players and persists them using source metadata", async () => {
    const dataSource: PlayerDataSource = {
      source: "WHOSCORED",
      fetchPlayers: vi.fn().mockResolvedValue([
        {
          externalId: "42",
          name: "Kylian Mbappé",
          team: "Real Madrid",
          league: League.LA_LIGA,
          position: Position.FORWARD,
          statistics: { goals: 10 },
        },
      ]),
    };
    const repository = {
      savePlayers: vi.fn(async (playerDataList: PlayerPersistenceData[]) =>
        playerDataList.map((playerData) => playerData.player),
      ),
    } as unknown as PlayerRepository;

    const persisted = await new PlayerService(
      dataSource,
      repository,
    ).syncFromSource();

    expect(persisted).toHaveLength(1);
    expect(persisted[0]?.statistics).toEqual({ goals: 10 });
    expect(repository.savePlayers).toHaveBeenCalledWith([
      expect.objectContaining({
        source: "WHOSCORED",
        externalId: "42",
        player: expect.objectContaining({ name: "Kylian Mbappé" }),
      }),
    ]);
  });

  it("catalogs players with default pagination and normalized filters", async () => {
    const repository = {
      findMany: vi.fn().mockResolvedValue({
        data: [player],
        total: 1,
      }),
    } as unknown as PlayerRepository;
    const service = new PlayerService({} as PlayerDataSource, repository);

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
    const service = new PlayerService({} as PlayerDataSource, repository);

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
    const service = new PlayerService({} as PlayerDataSource, repository);

    await expect(service.getById(player.id)).resolves.toBe(player);
  });

  it("raises not found when a player does not exist", async () => {
    const repository = { findById: vi.fn().mockResolvedValue(null) } as unknown as PlayerRepository;
    const service = new PlayerService({} as PlayerDataSource, repository);

    await expect(service.getById(player.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
