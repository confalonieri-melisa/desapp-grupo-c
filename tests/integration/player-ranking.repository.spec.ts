import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDatabase, db } from "@/backend/db";
import { playerQuotes, players, valuationStrategyVersions } from "@/backend/db/schema";
import { League, Position } from "@/backend/models/enums";
import { PlayerRankingRepository } from "@/backend/repositories/player-ranking.repository";

const activeVersionId = "00000000-0000-4000-8000-000000000701";
const inactiveVersionId = "00000000-0000-4000-8000-000000000702";
const playerOneId = "00000000-0000-4000-8000-000000000703";
const playerTwoId = "00000000-0000-4000-8000-000000000704";
const playerThreeId = "00000000-0000-4000-8000-000000000705";
const playerFourId = "00000000-0000-4000-8000-000000000711";
const quoteIds = [
  "00000000-0000-4000-8000-000000000706",
  "00000000-0000-4000-8000-000000000707",
  "00000000-0000-4000-8000-000000000708",
  "00000000-0000-4000-8000-000000000709",
  "00000000-0000-4000-8000-000000000710",
];
const repository = new PlayerRankingRepository();

describe.skipIf(process.env.RUN_DB_INTEGRATION_TESTS !== "true")(
  "PlayerRankingRepository",
  () => {
    let previousActiveIds: string[] = [];

    beforeAll(async () => {
      const activeRows = await db
        .select({ id: valuationStrategyVersions.id })
        .from(valuationStrategyVersions)
        .where(eq(valuationStrategyVersions.isActive, 1));
      previousActiveIds = activeRows.map((row) => row.id);
      await db.update(valuationStrategyVersions).set({ isActive: 0, activatedAt: null });
    });

    afterEach(async () => {
      await db.delete(playerQuotes).where(eq(playerQuotes.playerId, playerOneId));
      await db.delete(playerQuotes).where(eq(playerQuotes.playerId, playerTwoId));
      await db.delete(playerQuotes).where(eq(playerQuotes.playerId, playerThreeId));
      await db.delete(playerQuotes).where(eq(playerQuotes.playerId, playerFourId));
      await db.delete(valuationStrategyVersions).where(and(
        eq(valuationStrategyVersions.id, activeVersionId),
      ));
      await db.delete(valuationStrategyVersions).where(and(
        eq(valuationStrategyVersions.id, inactiveVersionId),
      ));
      await db.delete(players).where(eq(players.id, playerOneId));
      await db.delete(players).where(eq(players.id, playerTwoId));
      await db.delete(players).where(eq(players.id, playerThreeId));
      await db.delete(players).where(eq(players.id, playerFourId));
    });

    afterAll(async () => {
      for (const id of previousActiveIds) {
        await db.update(valuationStrategyVersions)
          .set({ isActive: 1, activatedAt: new Date() })
          .where(eq(valuationStrategyVersions.id, id));
      }
      await closeDatabase();
    });

    it("ranks latest quotes from the active version and applies filters/pagination", async () => {
      await db.insert(players).values([
        {
          id: playerOneId,
          source: "RANKING_TEST",
          externalId: "ranking-one",
          name: "Alpha Player",
          team: "Example FC",
          league: League.PREMIER_LEAGUE,
          position: Position.FORWARD,
          statistics: {},
        },
        {
          id: playerTwoId,
          source: "RANKING_TEST",
          externalId: "ranking-two",
          name: "Beta Player",
          team: "Example FC",
          league: League.PREMIER_LEAGUE,
          position: Position.DEFENDER,
          statistics: {},
        },
        {
          id: playerThreeId,
          source: "RANKING_TEST",
          externalId: "ranking-three",
          name: "Gamma Player",
          team: "Other FC",
          league: League.BUNDESLIGA,
          position: Position.FORWARD,
          statistics: {},
        },
        {
          id: playerFourId,
          source: "RANKING_TEST",
          externalId: "ranking-four",
          name: "Delta Player",
          team: "Example FC",
          league: League.PREMIER_LEAGUE,
          position: Position.FORWARD,
          statistics: {},
        },
      ]);
      await db.insert(valuationStrategyVersions).values([
        {
          id: activeVersionId,
          strategyCode: "INDIVIDUAL_PERFORMANCE",
          version: "ranking-active",
          configuration: {},
          isActive: 1,
        },
        {
          id: inactiveVersionId,
          strategyCode: "INDIVIDUAL_PERFORMANCE",
          version: "ranking-inactive",
          configuration: {},
          isActive: 0,
        },
      ]);
      await db.insert(playerQuotes).values([
        {
          id: quoteIds[0],
          playerId: playerOneId,
          strategyVersionId: activeVersionId,
          individualScore: "0.400000",
          finalScore: "0.400000",
          quoteValue: "40.60",
          explanation: {},
          calculatedAt: new Date("2026-10-20T10:00:00.000Z"),
        },
        {
          id: quoteIds[1],
          playerId: playerOneId,
          strategyVersionId: activeVersionId,
          individualScore: "0.900000",
          finalScore: "0.900000",
          quoteValue: "90.10",
          explanation: {},
          calculatedAt: new Date("2026-10-21T10:00:00.000Z"),
        },
        {
          id: quoteIds[2],
          playerId: playerTwoId,
          strategyVersionId: activeVersionId,
          individualScore: "0.800000",
          finalScore: "0.800000",
          quoteValue: "80.10",
          explanation: {},
          calculatedAt: new Date("2026-10-21T10:00:00.000Z"),
        },
        {
          id: quoteIds[3],
          playerId: playerThreeId,
          strategyVersionId: activeVersionId,
          individualScore: "0.700000",
          finalScore: "0.700000",
          quoteValue: "70.10",
          explanation: {},
          calculatedAt: new Date("2026-10-21T10:00:00.000Z"),
        },
        {
          id: quoteIds[4],
          playerId: playerOneId,
          strategyVersionId: inactiveVersionId,
          individualScore: "0.100000",
          finalScore: "0.100000",
          quoteValue: "10.10",
          explanation: {},
          calculatedAt: new Date("2026-10-22T10:00:00.000Z"),
        },
      ]);

      const result = await repository.findRankedPlayers(activeVersionId, {
        team: "example",
        page: 1,
        limit: 10,
      });

      expect(result.total).toBe(2);
      expect(result.rows.map((row) => row.playerId)).toEqual([playerOneId, playerTwoId]);
      expect(result.rows[0]?.finalScore).toBe(0.9);
      expect(result.rows[0]?.quoteValue).toBe(90.1);
    });
  },
);
