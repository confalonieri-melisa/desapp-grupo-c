import { and, count, eq, ilike, type SQL } from "drizzle-orm";
import { db as defaultDatabase, type Database } from "@/db";
import { players, type PlayerRow } from "@/db/schema";
import { League, Position } from "@/models/enums";
import { Player, type PlayerStatistics } from "@/models/Player";

export interface PlayerPersistenceData {
  player: Player;
  source: string;
  externalId: string;
}

export interface PlayerSearchFilters {
  league?: League;
  team?: string;
  position?: Position;
}

export interface PlayerPagination {
  page: number;
  limit: number;
}

export interface PlayerSearchResult {
  data: Player[];
  total: number;
}

type PlayerDatabaseExecutor = Pick<Database, "insert">;

export class PlayerRepository {
  constructor(private readonly database: Database = defaultDatabase) {}

  async savePlayers(playerDataList: PlayerPersistenceData[]): Promise<Player[]> {
    return this.database.transaction(async (transaction) => {
      const persistedPlayers: Player[] = [];

      for (const playerData of playerDataList) {
        persistedPlayers.push(await this.upsertPlayer(transaction, playerData));
      }

      return persistedPlayers;
    });
  }

  private async upsertPlayer(
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

  async findById(id: string): Promise<Player | null> {
    const rows = await this.database
        .select()
        .from(players)
        .where(eq(players.id, id))
        .limit(1);

    return rows[0] ? toPlayer(rows[0]) : null;
  }

  async findMany(
    filters: PlayerSearchFilters = {},
    pagination: PlayerPagination = { page: 1, limit: 20 },
  ): Promise<PlayerSearchResult> {
    const where = this.buildSearchConditions(filters);

    return {
      data: await this.findPage(where, pagination),
      total: await this.count(where),
    };
  }

  private async findPage(
    where: SQL | undefined,
    pagination: PlayerPagination,
  ): Promise<Player[]> {
    const offset = (pagination.page - 1) * pagination.limit;
    const rows = await this.database
      .select()
      .from(players)
      .where(where)
      .orderBy(players.name)
      .limit(pagination.limit)
      .offset(offset);

    return rows.map(toPlayer);
  }

  private async count(where: SQL | undefined): Promise<number> {
    const rows = await this.database
      .select({ count: count() })
      .from(players)
      .where(where);

    return Number(rows[0]?.count ?? 0);
  }

  private buildSearchConditions(
    filters: PlayerSearchFilters,
  ): SQL | undefined {
    const conditions: SQL[] = [];

    if (filters.league) {
      conditions.push(eq(players.league, filters.league));
    }

    if (filters.team) {
      conditions.push(ilike(players.team, `%${filters.team}%`));
    }

    if (filters.position) {
      conditions.push(eq(players.position, filters.position));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
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
