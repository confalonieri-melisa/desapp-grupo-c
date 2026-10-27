import { afterAll, afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDatabase, db } from "@/backend/db";
import {
  playerQuotes,
  players,
  valuationStrategyVersions,
} from "@/backend/db/schema";
import { League, Position } from "@/backend/models/enums";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";

const playerId = "00000000-0000-4000-8000-000000000301";
const versionId = "00000000-0000-4000-8000-000000000302";
const strategyVersion = "99.0.0";
const firstQuoteId = "00000000-0000-4000-8000-000000000303";
const latestQuoteId = "00000000-0000-4000-8000-000000000304";
const sameDateQuoteId = "00000000-0000-4000-8000-000000000305";
const repository = new ValuationRepository();

describe.skipIf(process.env.RUN_DB_INTEGRATION_TESTS !== "true")(
  "PlayerQuotesRepository read model",
  () => {
    afterEach(async () => {
      await db.delete(playerQuotes).where(eq(playerQuotes.playerId, playerId));
      await db.delete(valuationStrategyVersions).where(eq(valuationStrategyVersions.id, versionId));
      await db.delete(players).where(eq(players.id, playerId));
    });

    afterAll(async () => {
      await closeDatabase();
    });

    it("returns historical quotes with strategy metadata and stable ordering", async () => {
      await db.insert(players).values({
        id: playerId,
        source: "WHOSCORED",
        externalId: "quote-read-player",
        name: "Quote Read Player",
        team: "Example FC",
        league: League.PREMIER_LEAGUE,
        position: Position.FORWARD,
        statistics: {},
      });
      await db.insert(valuationStrategyVersions).values({
        id: versionId,
        strategyCode: "INDIVIDUAL_PERFORMANCE",
        version: strategyVersion,
        configuration: {},
      });
      await db.insert(playerQuotes).values([
        {
          id: firstQuoteId,
          playerId,
          strategyVersionId: versionId,
          individualScore: "0.400000",
          teamScore: null,
          finalScore: "0.400000",
          quoteValue: "40.60",
          explanation: { individual: [], team: [] },
          calculatedAt: new Date("2026-10-19T10:00:00.000Z"),
        },
        {
          id: latestQuoteId,
          playerId,
          strategyVersionId: versionId,
          individualScore: "0.800000",
          teamScore: null,
          finalScore: "0.800000",
          quoteValue: "80.20",
          explanation: { individual: [{ metric: "goals" }], team: [] },
          calculatedAt: new Date("2026-10-20T10:00:00.000Z"),
        },
        {
          id: sameDateQuoteId,
          playerId,
          strategyVersionId: versionId,
          individualScore: "0.850000",
          teamScore: null,
          finalScore: "0.850000",
          quoteValue: "85.20",
          explanation: { individual: [], team: [] },
          calculatedAt: new Date("2026-10-20T10:00:00.000Z"),
        },
      ]);

      const rows = await repository.findHistoryByPlayerId(playerId);

      expect(rows).toHaveLength(3);
      expect(rows[0]?.id).toBe(sameDateQuoteId);
      expect(rows[1]?.id).toBe(latestQuoteId);
      expect(rows[1]?.strategyCode).toBe("INDIVIDUAL_PERFORMANCE");
      expect(rows[1]?.strategyVersion).toBe(strategyVersion);
      expect(rows[2]?.id).toBe(firstQuoteId);
    });

    it("returns the latest quote before the exclusive next-day boundary", async () => {
      await db.insert(players).values({
        id: playerId,
        source: "WHOSCORED",
        externalId: "quote-date-player",
        name: "Quote Date Player",
        team: "Example FC",
        league: League.PREMIER_LEAGUE,
        position: Position.FORWARD,
        statistics: {},
      });
      await db.insert(valuationStrategyVersions).values({
        id: versionId,
        strategyCode: "INDIVIDUAL_PERFORMANCE",
        version: strategyVersion,
        configuration: {},
      });
      await db.insert(playerQuotes).values([
        {
          id: firstQuoteId,
          playerId,
          strategyVersionId: versionId,
          individualScore: "0.400000",
          finalScore: "0.400000",
          quoteValue: "40.60",
          explanation: {},
          calculatedAt: new Date("2026-10-20T23:59:59.000Z"),
        },
        {
          id: latestQuoteId,
          playerId,
          strategyVersionId: versionId,
          individualScore: "0.900000",
          finalScore: "0.900000",
          quoteValue: "90.10",
          explanation: {},
          calculatedAt: new Date("2026-10-21T00:00:00.000Z"),
        },
      ]);

      const quote = await repository.findLatestQuoteBefore(playerId, new Date("2026-10-21T00:00:00.000Z"));

      expect(quote?.id).toBe(firstQuoteId);

      const unavailable = await repository.findLatestQuoteBefore(playerId, new Date("2020-01-01T00:00:00.000Z"));
      expect(unavailable).toBeNull();
    });
  },
);
