import { afterAll, afterEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { closeDatabase, db } from "@/backend/db";
import {
  marketOperations,
  playerQuotes,
  players,
  users,
  valuationStrategyVersions,
} from "@/backend/db/schema";
import { League, Position, UserRole } from "@/backend/models/enums";
import { MarketRepository } from "@/backend/repositories/market.repository";

const investorId = "00000000-0000-4000-8000-000000000601";
const otherInvestorId = "00000000-0000-4000-8000-000000000602";
const playerId = "00000000-0000-4000-8000-000000000603";
const strategyId = "00000000-0000-4000-8000-000000000604";
const quoteId = "00000000-0000-4000-8000-000000000605";
const operationIds = [
  "00000000-0000-4000-8000-000000000611",
  "00000000-0000-4000-8000-000000000612",
  "00000000-0000-4000-8000-000000000613",
  "00000000-0000-4000-8000-000000000614",
];

describe.skipIf(process.env.RUN_DB_INTEGRATION_TESTS !== "true")(
  "MarketRepository operation history",
  () => {
    afterEach(async () => {
      await db.delete(marketOperations).where(inArray(marketOperations.id, operationIds));
      await db.delete(playerQuotes).where(eq(playerQuotes.id, quoteId));
      await db.delete(valuationStrategyVersions).where(eq(valuationStrategyVersions.id, strategyId));
      await db.delete(players).where(eq(players.id, playerId));
      await db.delete(users).where(inArray(users.id, [investorId, otherInvestorId]));
    });

    afterAll(async () => {
      await closeDatabase();
    });

    async function seed() {
      await db.insert(users).values([
        {
          id: investorId,
          email: "history-investor@example.com",
          password: "secret",
          name: "History Investor",
          role: UserRole.INVESTOR,
          creditBalance: "1000.00",
        },
        {
          id: otherInvestorId,
          email: "history-other@example.com",
          password: "secret",
          name: "Other Investor",
          role: UserRole.INVESTOR,
          creditBalance: "1000.00",
        },
      ]);
      await db.insert(players).values({
        id: playerId,
        source: "TEST",
        externalId: "history-player",
        name: "History Player",
        team: "Example FC",
        league: League.PREMIER_LEAGUE,
        position: Position.FORWARD,
        statistics: {},
      });
      await db.insert(valuationStrategyVersions).values({
        id: strategyId,
        strategyCode: "INDIVIDUAL_PERFORMANCE",
        version: "1.0.0",
        configuration: {},
      });
      await db.insert(playerQuotes).values({
        id: quoteId,
        playerId,
        strategyVersionId: strategyId,
        individualScore: "0.500000",
        finalScore: "0.500000",
        quoteValue: "10.00",
        explanation: {},
      });
      await db.insert(marketOperations).values([
        {
          id: operationIds[0],
          type: "BUY",
          investorId,
          playerId,
          quoteId,
          quoteValue: "10.00",
          quantity: 1,
          total: "10.00",
          createdAt: new Date("2026-10-24T12:00:00.000Z"),
        },
        {
          id: operationIds[1],
          type: "SELL",
          investorId,
          playerId,
          quoteId,
          quoteValue: "11.00",
          quantity: 1,
          total: "11.00",
          createdAt: new Date("2026-10-24T13:00:00.000Z"),
        },
        {
          id: operationIds[2],
          type: "BUY",
          investorId,
          playerId,
          quoteId,
          quoteValue: "12.00",
          quantity: 2,
          total: "24.00",
          createdAt: new Date("2026-10-24T13:00:00.000Z"),
        },
        {
          id: operationIds[3],
          type: "BUY",
          investorId: otherInvestorId,
          playerId,
          quoteId,
          quoteValue: "99.00",
          quantity: 5,
          total: "495.00",
          createdAt: new Date("2026-10-24T14:00:00.000Z"),
        },
      ]);
    }

    it("filters by investor and orders by date then id", async () => {
      await seed();

      const page = await new MarketRepository().findOperationsByInvestorId(investorId, 2, 0);

      expect(page.rows.map((row) => row.id)).toEqual([operationIds[2], operationIds[1]]);
      expect(page.hasMore).toBe(true);
    });

    it("supports offset and returns the final page without writing", async () => {
      await seed();
      const before = await db.select().from(marketOperations);

      const page = await new MarketRepository().findOperationsByInvestorId(investorId, 2, 2);

      const after = await db.select().from(marketOperations);
      expect(page.rows.map((row) => row.id)).toEqual([operationIds[0]]);
      expect(page.hasMore).toBe(false);
      expect(after).toEqual(before);
    });
  },
);
