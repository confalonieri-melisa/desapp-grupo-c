import { afterAll, afterEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { closeDatabase, db } from "@/backend/db";
import {
  financialAuditRecords,
  marketOperations,
  playerQuotes,
  players,
  tokenHoldings,
  users,
  valuationStrategyVersions,
} from "@/backend/db/schema";
import { League, Position, UserRole } from "@/backend/models/enums";
import { MarketOperationService } from "@/backend/services/market-operation.service";
import { MarketRepository } from "@/backend/repositories/market.repository";

const investorId = "00000000-0000-4000-8000-000000000501";
const poolId = "00000000-0000-4000-8000-000000000502";
const playerId = "00000000-0000-4000-8000-000000000503";
const strategyId = "00000000-0000-4000-8000-000000000504";
const quoteId = "00000000-0000-4000-8000-000000000505";
const service = new MarketOperationService();
const auth = { sub: investorId, email: "market-investor@example.com", role: UserRole.INVESTOR };

describe.skipIf(process.env.RUN_DB_INTEGRATION_TESTS !== "true")(
  "MarketRepository financial operations",
  () => {
    afterEach(async () => {
      await db.delete(financialAuditRecords);
      await db.delete(marketOperations);
      await db.delete(tokenHoldings).where(eq(tokenHoldings.playerId, playerId));
      await db.delete(playerQuotes).where(eq(playerQuotes.id, quoteId));
      await db.delete(valuationStrategyVersions).where(eq(valuationStrategyVersions.id, strategyId));
      await db.delete(players).where(eq(players.id, playerId));
      await db.delete(users).where(inArray(users.id, [investorId, poolId]));
    });

    afterAll(async () => {
      await closeDatabase();
    });

    async function seedMarket(withPoolHolding = true) {
      await db.insert(users).values([
        {
          id: investorId,
          email: "market-investor@example.com",
          password: "secret",
          name: "Market Investor",
          role: UserRole.INVESTOR,
          creditBalance: "1000.00",
        },
        {
          id: poolId,
          email: "market-pool@example.com",
          password: "secret",
          name: "Market Pool",
          role: UserRole.SUPERUSER,
          creditBalance: "1000.00",
        },
      ]);
      await db.insert(players).values({
        id: playerId,
        source: "TEST",
        externalId: "market-player",
        name: "Market Player",
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
      if (withPoolHolding) {
        await db.insert(tokenHoldings).values({
          userId: poolId,
          playerId,
          quantity: 100,
          averagePurchasePrice: "1.00",
        });
      }
    }

    it("assigns the initial pool tokens idempotently", async () => {
      await seedMarket(false);
      const repository = new MarketRepository();

      await repository.assignInitialTokens([playerId]);
      await repository.assignInitialTokens([playerId]);

      await expect(db.select().from(tokenHoldings)
        .where(eq(tokenHoldings.playerId, playerId))).resolves.toMatchObject([
        {
          userId: poolId,
          quantity: 100,
          averagePurchasePrice: "1.00",
        },
      ]);
    });

    it("transfers buy and sell atomically and records audit snapshots", async () => {
      await seedMarket();

      const buy = await service.buy(auth, {
        playerId,
        quantity: 3,
      });

      expect(buy.creditBalance).toBe(970);
      expect(buy.holding.quantity).toBe(3);
      expect(buy.holding.averagePurchasePrice).toBe(10);

      const sell = await service.sell(auth, {
        playerId,
        quantity: 1,
      });

      expect(sell.creditBalance).toBe(980);
      expect(sell.holding.quantity).toBe(2);
      expect((await db.select().from(marketOperations))).toHaveLength(2);
      expect((await db.select().from(financialAuditRecords))).toHaveLength(2);

      const holdings = await db.select().from(tokenHoldings)
        .where(eq(tokenHoldings.playerId, playerId));
      expect(holdings.reduce((sum, holding) => sum + holding.quantity, 0)).toBe(100);
    });

    it("rejects a sale without changing state", async () => {
      await seedMarket();

      await expect(service.sell(auth, {
        playerId,
        quantity: 1,
      })).rejects.toMatchObject({ status: 409 });

      expect((await db.select().from(marketOperations))).toHaveLength(0);
      expect((await db.select().from(financialAuditRecords))).toHaveLength(0);
    });
  },
);
