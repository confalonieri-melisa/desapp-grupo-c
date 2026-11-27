import { and, asc, eq } from "drizzle-orm";
import { db as defaultDatabase, type Database } from "@/backend/db";
import { p2pOffers, users, type P2POfferRow } from "@/backend/db/schema";
import { P2POffer, type P2POfferStatus } from "@/backend/models/P2POffer";
import type { MarketExecutor } from "@/backend/repositories/market.repository";

export class P2POfferRepository {
  constructor(private readonly database: Database = defaultDatabase) {}

  async publishOffer(offer: P2POffer, executor: MarketExecutor = this.database): Promise<P2POffer> {
    const rows = await executor
      .insert(p2pOffers)
      .values({
        id: offer.id,
        sellerId: offer.sellerId,
        playerId: offer.playerId,
        quantity: offer.quantity,
        unitPrice: offer.unitPrice.toFixed(2),
        status: offer.status,
        createdAt: offer.createdAt,
        completedAt: offer.completedAt,
      })
      .returning();
    return toOffer(rows[0]);
  }

  async findAvailableOffers(playerId?: string): Promise<{ offer: P2POffer; sellerName: string }[]> {
    const condition = playerId
      ? and(eq(p2pOffers.status, "OPEN"), eq(p2pOffers.playerId, playerId))
      : eq(p2pOffers.status, "OPEN");
    const rows = await this.database
      .select({ offer: p2pOffers, sellerName: users.name })
      .from(p2pOffers)
      .innerJoin(users, eq(p2pOffers.sellerId, users.id))
      .where(condition)
      .orderBy(asc(p2pOffers.createdAt), asc(p2pOffers.id));
    return rows.map(({ offer, sellerName }) => ({ offer: toOffer(offer), sellerName }));
  }

  async findOfferForCompletion(id: string, executor: MarketExecutor): Promise<P2POffer | null> {
    const rows = await executor.select().from(p2pOffers).where(eq(p2pOffers.id, id)).for("update");
    return rows[0] ? toOffer(rows[0]) : null;
  }

  async findOwnedOffer(id: string, sellerId: string, executor: MarketExecutor = this.database) {
    const rows = await executor
      .select()
      .from(p2pOffers)
      .where(and(eq(p2pOffers.id, id), eq(p2pOffers.sellerId, sellerId)))
      .for("update");
    return rows[0] ? toOffer(rows[0]) : null;
  }

  async completeOffer(offer: P2POffer, executor: MarketExecutor): Promise<void> {
    await this.updateOffer(offer, executor);
  }

  async cancelOffer(offer: P2POffer, executor: MarketExecutor = this.database): Promise<void> {
    await this.updateOffer(offer, executor);
  }

  private async updateOffer(offer: P2POffer, executor: MarketExecutor): Promise<void> {
    await executor
      .update(p2pOffers)
      .set({ status: offer.status, completedAt: offer.completedAt })
      .where(eq(p2pOffers.id, offer.id));
  }
}

function toOffer(row: P2POfferRow | undefined): P2POffer {
  if (!row) throw new Error("P2P offer could not be persisted");
  return new P2POffer({
    id: row.id,
    sellerId: row.sellerId,
    playerId: row.playerId,
    quantity: row.quantity,
    unitPrice: Number(row.unitPrice),
    status: row.status as P2POfferStatus,
    createdAt: row.createdAt,
    completedAt: row.completedAt ?? undefined,
  });
}
