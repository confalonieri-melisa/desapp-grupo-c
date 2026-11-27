import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { closeDatabase, db } from "@/backend/db";
import {
  financialAuditRecords,
  marketOperations,
  p2pOffers,
  players,
  tokenHoldings,
  users,
} from "@/backend/db/schema";
import { League, Position, UserRole } from "@/backend/models/enums";
import { P2PTradeService } from "@/backend/services/p2p-trade.service";
import { MarketRepository } from "@/backend/repositories/market.repository";
import { P2POfferRepository } from "@/backend/repositories/p2p-offer.repository";

const sellerId = "00000000-0000-4000-8000-000000000801";
const buyerOneId = "00000000-0000-4000-8000-000000000802";
const buyerTwoId = "00000000-0000-4000-8000-000000000803";
const playerId = "00000000-0000-4000-8000-000000000804";
const offerId = "00000000-0000-4000-8000-000000000805";

const auth = (sub: string) => ({ sub, email: `${sub}@test.local`, role: "INVESTOR" });

describe.skipIf(process.env.RUN_DB_INTEGRATION_TESTS !== "true")(
  "P2P trade persistence and concurrency",
  () => {
    afterEach(async () => {
      const operations = await db
        .select({ id: marketOperations.id })
        .from(marketOperations)
        .where(eq(marketOperations.offerId, offerId));
      if (operations.length) {
        await db.delete(financialAuditRecords).where(
          inArray(
            financialAuditRecords.operationId,
            operations.map((operation) => operation.id),
          ),
        );
        await db.delete(marketOperations).where(
          inArray(
            marketOperations.id,
            operations.map((operation) => operation.id),
          ),
        );
      }
      await db.delete(p2pOffers).where(eq(p2pOffers.id, offerId));
      await db
        .delete(tokenHoldings)
        .where(
          and(
            eq(tokenHoldings.playerId, playerId),
            inArray(tokenHoldings.userId, [sellerId, buyerOneId, buyerTwoId]),
          ),
        );
      await db.delete(players).where(eq(players.id, playerId));
      await db.delete(users).where(inArray(users.id, [sellerId, buyerOneId, buyerTwoId]));
    });

    afterAll(async () => {
      await closeDatabase();
    });

    async function seed() {
      await db.insert(users).values([
        {
          id: sellerId,
          email: `${sellerId}@test.local`,
          password: "secret",
          name: "Seller",
          role: UserRole.INVESTOR,
          creditBalance: "100.00",
        },
        {
          id: buyerOneId,
          email: `${buyerOneId}@test.local`,
          password: "secret",
          name: "Buyer One",
          role: UserRole.INVESTOR,
          creditBalance: "100.00",
        },
        {
          id: buyerTwoId,
          email: `${buyerTwoId}@test.local`,
          password: "secret",
          name: "Buyer Two",
          role: UserRole.INVESTOR,
          creditBalance: "100.00",
        },
      ]);
      await db.insert(players).values({
        id: playerId,
        source: "TEST",
        externalId: `p2p-${playerId}`,
        name: "P2P Player",
        team: "Example FC",
        league: League.PREMIER_LEAGUE,
        position: Position.FORWARD,
        statistics: {},
      });
      await db.insert(tokenHoldings).values({
        id: "00000000-0000-4000-8000-000000000806",
        userId: sellerId,
        playerId,
        quantity: 5,
        averagePurchasePrice: "8.00",
      });
      await db.insert(p2pOffers).values({
        id: offerId,
        sellerId,
        playerId,
        quantity: 2,
        unitPrice: "10.00",
        status: "OPEN",
      });
    }

    it("lists open offers with the seller name", async () => {
      await seed();
      const offers = await new P2POfferRepository().findAvailableOffers(playerId);
      expect(offers).toEqual([
        expect.objectContaining({
          sellerName: "Seller",
          offer: expect.objectContaining({ id: offerId, sellerId }),
        }),
      ]);
    });

    it("allows only one concurrent buyer to consume an offer", async () => {
      await seed();
      const service = new P2PTradeService();

      const results = await Promise.allSettled([
        service.completeOffer(auth(buyerOneId), offerId, "buyer-one-key"),
        service.completeOffer(auth(buyerTwoId), offerId, "buyer-two-key"),
      ]);

      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
      await expect(
        db.select().from(p2pOffers).where(eq(p2pOffers.id, offerId)),
      ).resolves.toMatchObject([{ status: "FILLED" }]);
      await expect(
        db.select().from(marketOperations).where(eq(marketOperations.offerId, offerId)),
      ).resolves.toHaveLength(1);
      await expect(
        db
          .select({ quantity: tokenHoldings.quantity })
          .from(tokenHoldings)
          .where(and(eq(tokenHoldings.userId, sellerId), eq(tokenHoldings.playerId, playerId))),
      ).resolves.toMatchObject([{ quantity: 3 }]);
      await expect(
        db
          .select({ quantity: tokenHoldings.quantity })
          .from(tokenHoldings)
          .where(and(eq(tokenHoldings.userId, buyerOneId), eq(tokenHoldings.playerId, playerId))),
      ).resolves.toMatchObject([{ quantity: 2 }]);
    });

    it("returns the same receipt for concurrent retries with the same key", async () => {
      await seed();
      const service = new P2PTradeService();

      const results = await Promise.all([
        service.completeOffer(auth(buyerOneId), offerId, "same-key"),
        service.completeOffer(auth(buyerOneId), offerId, "same-key"),
      ]);

      expect(results[0].operation.id).toBe(results[1].operation.id);
      await expect(
        db.select().from(marketOperations).where(eq(marketOperations.offerId, offerId)),
      ).resolves.toHaveLength(1);
    });

    it("rolls back balances, holdings, offer and operation when audit persistence fails", async () => {
      await seed();
      const marketRepository = new MarketRepository();
      vi.spyOn(marketRepository, "recordFinancialTransition").mockRejectedValue(
        new Error("audit persistence failed"),
      );
      const service = new P2PTradeService(marketRepository, new P2POfferRepository());

      await expect(
        service.completeOffer(auth(buyerOneId), offerId, "rollback-key"),
      ).rejects.toThrow("audit persistence failed");

      await expect(
        db.select().from(p2pOffers).where(eq(p2pOffers.id, offerId)),
      ).resolves.toMatchObject([{ status: "OPEN" }]);
      await expect(
        db.select().from(marketOperations).where(eq(marketOperations.offerId, offerId)),
      ).resolves.toHaveLength(0);
      await expect(
        db
          .select({ quantity: tokenHoldings.quantity })
          .from(tokenHoldings)
          .where(and(eq(tokenHoldings.userId, sellerId), eq(tokenHoldings.playerId, playerId))),
      ).resolves.toMatchObject([{ quantity: 5 }]);
      await expect(
        db
          .select({ creditBalance: users.creditBalance })
          .from(users)
          .where(eq(users.id, buyerOneId)),
      ).resolves.toMatchObject([{ creditBalance: "100.00" }]);
    });
  },
);
