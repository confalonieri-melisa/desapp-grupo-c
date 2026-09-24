import { describe, expect, it, vi } from "vitest";
import { PlayerSyncService } from "@/services/player-sync.service";
import type { PlayerDataSource } from "@/adapters/player-data-source";
import type {
  PlayerPersistenceData,
  PlayerRepository,
} from "@/repositories/player.repository";
import { League, Position } from "@/models/enums";

describe("PlayerSyncService", () => {
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

    const persisted = await new PlayerSyncService(
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
});
