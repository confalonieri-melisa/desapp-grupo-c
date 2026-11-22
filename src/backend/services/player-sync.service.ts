import type { PlayerDataSource, ScrapedPlayer } from "@/backend/adapters/player-data-source";
import { Player } from "@/backend/models/Player";
import {
  PlayerRepository,
  type PlayerPersistenceData,
} from "@/backend/repositories/player.repository";
import { MarketRepository } from "@/backend/repositories/market.repository";
import { setTimeout as delay } from "node:timers/promises";
import type { Database } from "@/backend/db";
import type { BatchCounts } from "@/backend/models/batch-job";
import { BatchJobRepository } from "@/backend/repositories/batch-job.repository";

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

  async syncBatch(turnId: string, session: Database): Promise<BatchCounts> {
    let scraped: ScrapedPlayer[];
    try {
      scraped = await this.dataSource.fetchPlayers();
    } catch {
      console.info(JSON.stringify({ event: "batch.source.retry", turnId }));
      await delay(1000);
      scraped = await this.dataSource.fetchPlayers();
    }
    if (scraped.length === 0) throw new Error("WhoScored returned no players");
    const inputs: PlayerPersistenceData[] = scraped.map((item) => ({
      player: new Player({
        name: item.name,
        team: item.team,
        league: item.league,
        position: item.position,
        statistics: item.statistics,
      }),
      source: this.dataSource.source,
      externalId: item.externalId,
    }));
    const counts = { processed: inputs.length, succeeded: inputs.length, rejected: 0 };
    await session.transaction(async (tx) => {
      const saved: Player[] = [];
      for (const input of inputs)
        saved.push(await this.playerRepository.savePlayerInTransaction(input, tx));
      await this.marketRepository.assignInitialTokensInTransaction(
        saved.map((player) => player.id),
        tx,
      );
      await new BatchJobRepository(session).finishTurn(turnId, "COMPLETED", counts, undefined, tx);
    });
    return counts;
  }

  private async savePlayers(scrapedPlayers: ScrapedPlayer[]): Promise<Player[]> {
    const playerDataList: PlayerPersistenceData[] = scrapedPlayers.map((scrapedPlayer) => ({
      player: new Player({
        name: scrapedPlayer.name,
        team: scrapedPlayer.team,
        league: scrapedPlayer.league,
        position: scrapedPlayer.position,
        statistics: scrapedPlayer.statistics,
      }),
      source: this.dataSource.source,
      externalId: scrapedPlayer.externalId,
    }));

    const players = await this.playerRepository.savePlayers(playerDataList);
    await this.marketRepository.assignInitialTokens(players.map((player) => player.id));
    return players;
  }
}
