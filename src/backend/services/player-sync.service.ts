import type {
  PlayerDataSource,
  ScrapedPlayer,
} from "@/backend/adapters/player-data-source";
import { Player } from "@/backend/models/Player";
import {
  PlayerRepository,
  type PlayerPersistenceData,
} from "@/backend/repositories/player.repository";
import { MarketRepository } from "@/backend/repositories/market.repository";

export class PlayerSyncService {
  constructor(
    private readonly dataSource: PlayerDataSource,
    private readonly playerRepository: PlayerRepository,
    private readonly marketRepository: MarketRepository,
  ) {}

  async syncFromSource(): Promise<Player[]> {
    const scrapedPlayers = await this.dataSource.fetchPlayers();
    return this.savePlayers(scrapedPlayers);
  }

  private async savePlayers(scrapedPlayers: ScrapedPlayer[]): Promise<Player[]> {
    const playerDataList: PlayerPersistenceData[] = scrapedPlayers.map(
      (scrapedPlayer) => ({
        player: new Player({
          name: scrapedPlayer.name,
          team: scrapedPlayer.team,
          league: scrapedPlayer.league,
          position: scrapedPlayer.position,
          statistics: scrapedPlayer.statistics,
        }),
        source: this.dataSource.source,
        externalId: scrapedPlayer.externalId,
      }),
    );

    const players = await this.playerRepository.savePlayers(playerDataList);
    await this.marketRepository.assignInitialTokens(players.map((player) => player.id));
    return players;
  }
}
