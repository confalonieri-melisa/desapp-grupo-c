import { sql, type SQL } from "drizzle-orm";
import { db as defaultDatabase, type Database } from "@/backend/db";
import type { League, Position } from "@/backend/models/enums";
import type {
  PlayerFilters,
  PlayerRankingCriteria,
  PlayerRankingResult,
  PlayerRankingRow,
} from "@/backend/services/player-ranking.types";

type RankingDatabaseRow = {
  player_id: string;
  name: string;
  team: string;
  league: League;
  position: Position;
  final_score: string | number;
  quote_value: string | number;
  unit: string;
  calculated_at: Date;
};

type CountDatabaseRow = { total: string | number };

export class PlayerRankingRepository {
  constructor(private readonly database: Database = defaultDatabase) {}

  async findRankedPlayers(strategyVersionId: string, criteria: PlayerRankingCriteria): Promise<PlayerRankingResult> {
    const rows = await this.findRankedPlayerRows(strategyVersionId, criteria);
    const total = await this.countRankedPlayers(strategyVersionId, criteria);

    return {
      rows: rows.map(toPlayerRankingRow),
      total,
      page: criteria.page,
      limit: criteria.limit,
    };
  }

  private async findRankedPlayerRows(strategyVersionId: string, criteria: PlayerRankingCriteria): Promise<RankingDatabaseRow[]> {
    const offset = (criteria.page - 1) * criteria.limit;
    const filters = this.playerFiltersWhere(criteria);
    const latestQuotePerPlayer = this.latestQuotePerPlayer(strategyVersionId);

    return await this.database.execute(sql`
      ${latestQuotePerPlayer}
      SELECT
        p.id AS player_id,
        p.name,
        p.team,
        p.league,
        p.position,
        q.final_score,
        q.quote_value,
        q.unit,
        q.calculated_at
      FROM players p
      INNER JOIN latest_quotes q ON q.player_id = p.id
      ${filters}
      ORDER BY q.final_score DESC, q.quote_value DESC, p.name ASC, p.id ASC
      LIMIT ${criteria.limit}
      OFFSET ${offset}
    `) as unknown as RankingDatabaseRow[];
  }

  private async countRankedPlayers(strategyVersionId: string, criteria: PlayerRankingCriteria): Promise<number> {
    const filters = this.playerFiltersWhere(criteria);
    const latestQuotePerPlayer = this.latestQuotePerPlayer(strategyVersionId);
    const rows = await this.database.execute(sql`
      ${latestQuotePerPlayer}
      SELECT COUNT(*)::int AS total
      FROM players p
      INNER JOIN latest_quotes q ON q.player_id = p.id
      ${filters}
    `) as unknown as CountDatabaseRow[];

    return Number(rows[0]?.total ?? 0);
  }

  private latestQuotePerPlayer(strategyVersionId: string): SQL {
    return sql`
      WITH latest_quotes AS (
        SELECT DISTINCT ON (q.player_id)
          q.player_id,
          q.final_score,
          q.quote_value,
          q.unit,
          q.calculated_at
        FROM player_quotes q
        WHERE q.strategy_version_id = ${strategyVersionId}
        ORDER BY q.player_id, q.calculated_at DESC, q.id DESC
      )
    `;
  }

  private playerFiltersWhere(criteria: PlayerFilters): SQL {
    const conditions: SQL[] = [];

    if (criteria.league) {
      conditions.push(sql`p.league = ${criteria.league}`);
    }
    if (criteria.team) {
      conditions.push(sql`p.team ILIKE ${`%${criteria.team}%`}`);
    }
    if (criteria.position) {
      conditions.push(sql`p.position = ${criteria.position}`);
    }

    return conditions.length
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;
  }
}

function toPlayerRankingRow(row: RankingDatabaseRow): PlayerRankingRow {
  return {
    playerId: row.player_id,
    name: row.name,
    team: row.team,
    league: row.league,
    position: row.position,
    finalScore: Number(row.final_score),
    quoteValue: Number(row.quote_value),
    unit: row.unit,
    calculatedAt: row.calculated_at,
  };
}
