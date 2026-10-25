import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { Database } from "@/backend/db";
import { League, Position } from "@/backend/models/enums";
import { PlayerRankingRepository } from "@/backend/repositories/player-ranking.repository";

const databaseRow = {
  player_id: "player-1",
  name: "Player One",
  team: "Example FC",
  league: League.PREMIER_LEAGUE,
  position: Position.FORWARD,
  final_score: "0.900000",
  quote_value: "90.10",
  unit: "CREDIT_PER_TOKEN",
  calculated_at: new Date("2026-10-24T15:00:00.000Z"),
};

describe("PlayerRankingRepository", () => {
  it("returns mapped players, total and pagination data from the database", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce([databaseRow])
      .mockResolvedValueOnce([{ total: "3" }]);
    const repository = new PlayerRankingRepository({ execute } as unknown as Database);

    await expect(repository.findRankedPlayers("version-1", {
      league: League.PREMIER_LEAGUE,
      team: "Example",
      position: Position.FORWARD,
      page: 2,
      limit: 10,
    })).resolves.toEqual({
      rows: [{
        playerId: "player-1",
        name: "Player One",
        team: "Example FC",
        league: League.PREMIER_LEAGUE,
        position: Position.FORWARD,
        finalScore: 0.9,
        quoteValue: 90.1,
        unit: "CREDIT_PER_TOKEN",
        calculatedAt: databaseRow.calculated_at,
      }],
      total: 3,
      page: 2,
      limit: 10,
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("builds the ranking query with the active version, filters and page offset", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 0 }]);
    const repository = new PlayerRankingRepository({ execute } as unknown as Database);

    await repository.findRankedPlayers("version-1", {
      league: League.PREMIER_LEAGUE,
      team: "Example",
      position: Position.FORWARD,
      page: 3,
      limit: 10,
    });

    const dialect = new PgDialect();
    const pageQuery = dialect.sqlToQuery(execute.mock.calls[0][0]);
    const countQuery = dialect.sqlToQuery(execute.mock.calls[1][0]);

    expect(pageQuery.sql).toContain("WHERE p.league = $2 AND p.team ILIKE $3 AND p.position = $4");
    expect(pageQuery.sql).toMatch(/LIMIT \$5\s+OFFSET \$6/);
    expect(pageQuery.params).toEqual(["version-1", League.PREMIER_LEAGUE, "%Example%", Position.FORWARD, 10, 20]);
    expect(countQuery.sql).toContain("SELECT COUNT(*)::int AS total");
    expect(countQuery.params).toEqual(["version-1", League.PREMIER_LEAGUE, "%Example%", Position.FORWARD]);
  });

  it("returns an empty result when the count query has no row", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const repository = new PlayerRankingRepository({ execute } as unknown as Database);

    await expect(repository.findRankedPlayers("version-1", { page: 1, limit: 20 }))
      .resolves.toMatchObject({ rows: [], total: 0 });
  });
});
