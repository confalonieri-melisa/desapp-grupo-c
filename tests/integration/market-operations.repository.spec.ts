import { afterAll, afterEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { closeDatabase, db } from "@/backend/db";
import {
  financialAuditRecords,
  idempotencyKeys,
  marketOperations,
  playerQuotes,
  players,
  tokenHoldings,
  users,
  valuationStrategyVersions,
} from "@/backend/db/schema";
import { League, Position, UserRole } from "@/backend/models/enums";
import {
  BusinessConflictError,
  IdempotencyConflictError,
} from "@/backend/errors/application.error";
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
      await db.delete(idempotencyKeys);
      await db.delete(marketOperations);
      await db.delete(tokenHoldings).where(eq(tokenHoldings.playerId, playerId));
      await db.delete(playerQuotes).where(eq(playerQuotes.id, quoteId));
      await db
        .delete(valuationStrategyVersions)
        .where(eq(valuationStrategyVersions.id, strategyId));
      await db.delete(players).where(eq(players.id, playerId));
      await db.delete(users).where(inArray(users.id, [investorId, poolId]));
    });

    afterAll(async () => {
      await closeDatabase();
    });

    async function seedMarket(withPoolHolding = true, poolQuantity = 100) {
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
          quantity: poolQuantity,
          averagePurchasePrice: "1.00",
        });
      }
    }

    it("assigns the initial pool tokens idempotently", async () => {
      await seedMarket(false);
      const repository = new MarketRepository();

      await repository.assignInitialTokens([playerId]);
      await repository.assignInitialTokens([playerId]);

      await expect(
        db.select().from(tokenHoldings).where(eq(tokenHoldings.playerId, playerId)),
      ).resolves.toMatchObject([
        {
          userId: poolId,
          quantity: 100,
          averagePurchasePrice: "1.00",
        },
      ]);
    });

    it("transfers a buy atomically and records audit snapshots", async () => {
      await seedMarket();

      const buy = await service.buy(
        auth,
        {
          playerId,
          quantity: 3,
        },
        "initial-buy",
        undefined,
      );

      expect(buy.creditBalance).toBe(970);
      expect(buy.holding.quantity).toBe(3);
      expect(buy.holding.averagePurchasePrice).toBe(10);

      expect(await db.select().from(marketOperations)).toHaveLength(1);
      expect(await db.select().from(financialAuditRecords)).toHaveLength(1);

      const holdings = await db
        .select()
        .from(tokenHoldings)
        .where(eq(tokenHoldings.playerId, playerId));
      expect(holdings.reduce((sum, holding) => sum + holding.quantity, 0)).toBe(100);
    });

    it("replays an idempotent buy without duplicating financial effects", async () => {
      await seedMarket();
      const order = { playerId, quantity: 3 };

      const first = await service.buy(auth, order, "buy-replay", undefined);
      const replay = await service.buy(auth, order, "buy-replay", undefined);

      expect(replay.operation.id).toBe(first.operation.id);
      expect(replay.creditBalance).toBe(first.creditBalance);
      expect(await db.select().from(marketOperations)).toHaveLength(1);
      expect(await db.select().from(financialAuditRecords)).toHaveLength(1);
      expect(
        await db.select().from(tokenHoldings).where(eq(tokenHoldings.userId, investorId)),
      ).toMatchObject([{ quantity: 3 }]);
    });

    it("rejects a reused key with a different buy payload", async () => {
      await seedMarket();

      await service.buy(auth, { playerId, quantity: 3 }, "buy-conflict", undefined);
      await expect(
        service.buy(auth, { playerId, quantity: 4 }, "buy-conflict", undefined),
      ).rejects.toBeInstanceOf(IdempotencyConflictError);

      expect(await db.select().from(marketOperations)).toHaveLength(1);
      expect(await db.select().from(financialAuditRecords)).toHaveLength(1);
    });

    it("rejects an exhausted pool without changing balances or audit", async () => {
      await seedMarket(true, 1);

      await expect(
        service.buy(auth, { playerId, quantity: 2 }, "pool-empty", undefined),
      ).rejects.toBeInstanceOf(BusinessConflictError);
      expect(await db.select().from(marketOperations)).toHaveLength(0);
      expect(await db.select().from(financialAuditRecords)).toHaveLength(0);
    });

    it("rejects an insufficient balance without changing holdings", async () => {
      await seedMarket();
      await db.update(users).set({ creditBalance: "1.00" }).where(eq(users.id, investorId));

      await expect(
        service.buy(auth, { playerId, quantity: 1 }, "balance-low", undefined),
      ).rejects.toBeInstanceOf(BusinessConflictError);
      expect(await db.select().from(marketOperations)).toHaveLength(0);
      expect(await db.select().from(financialAuditRecords)).toHaveLength(0);
      expect(
        await db.select().from(tokenHoldings).where(eq(tokenHoldings.userId, investorId)),
      ).toHaveLength(0);
    });
  },
);
