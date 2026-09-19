import { Player } from "@/models/Player";
import {
  PlayerRepository,
  type PlayerPersistenceData,
} from "@/repositories/player.repository";
import type {
  PlayerDataSource,
  ScrapedPlayer,
} from "@/adapters/player-data-source";

/** Application service for player use cases, including source synchronization. */
export class PlayerService {
  constructor(
    private readonly dataSource: PlayerDataSource,
    private readonly playerRepository: PlayerRepository,
  ) {}

  async syncFromSource(): Promise<Player[]> {
    const scrapedPlayers = await this.dataSource.fetchPlayers();
    return this.savePlayers(scrapedPlayers);
  }

  private savePlayers(scrapedPlayers: ScrapedPlayer[]): Promise<Player[]> {
    const playerDataList: PlayerPersistenceData[] = scrapedPlayers.map(
      (scrapedPlayer) => {
        const player = new Player({
          name: scrapedPlayer.name,
          team: scrapedPlayer.team,
          league: scrapedPlayer.league,
          position: scrapedPlayer.position,
          statistics: scrapedPlayer.statistics,
        });

        return {
          player,
          source: this.dataSource.source,
          externalId: scrapedPlayer.externalId,
        };
      },
    );

    return this.playerRepository.savePlayers(playerDataList);
  }
}
