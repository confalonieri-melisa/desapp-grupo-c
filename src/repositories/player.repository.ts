import { db as defaultDatabase, type Database } from "@/db";
import { players, type PlayerRow } from "@/db/schema";
import { League, Position } from "@/models/enums";
import { Player, type PlayerStatistics } from "@/models/Player";

export interface PlayerPersistenceData {
  player: Player;
  source: string;
  externalId: string;
}

export class PlayerRepository {
  constructor(private readonly database: Database = defaultDatabase) {}

  async savePlayers(playerDataList: PlayerPersistenceData[]): Promise<Player[]> {
    return this.database.transaction(async (transaction) => {
      const persistedPlayers: Player[] = [];

      for (const playerData of playerDataList) {
        persistedPlayers.push(await upsertPlayer(transaction, playerData));
      }

      return persistedPlayers;
    });
  }
}

type PlayerDatabaseExecutor = Pick<Database, "insert">;

async function upsertPlayer(
  database: PlayerDatabaseExecutor,
  playerData: PlayerPersistenceData,
): Promise<Player> {
  const rows = await database
    .insert(players)
    .values({
      id: playerData.player.id,
      source: playerData.source,
      externalId: playerData.externalId,
      name: playerData.player.name,
      team: playerData.player.team,
      league: playerData.player.league,
      position: playerData.player.position,
      statistics: playerData.player.statistics,
      createdAt: playerData.player.createdAt,
      updatedAt: playerData.player.updatedAt,
    })
    .onConflictDoUpdate({
      target: [players.source, players.externalId],
      set: {
        name: playerData.player.name,
        team: playerData.player.team,
        league: playerData.player.league,
        position: playerData.player.position,
        statistics: playerData.player.statistics,
        updatedAt: playerData.player.updatedAt,
      },
    })
    .returning();

  if (!rows[0]) {
    throw new Error("Player could not be persisted");
  }

  return toPlayer(rows[0]);
}

export function toPlayer(row: PlayerRow): Player {
  return new Player({
    id: row.id,
    name: row.name,
    team: row.team,
    league: row.league as League,
    position: row.position as Position,
    statistics: row.statistics as PlayerStatistics,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
