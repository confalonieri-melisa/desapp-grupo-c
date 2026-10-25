import { and, eq, gt } from "drizzle-orm";
import { db as defaultDatabase, type Database } from "@/backend/db";
import { tokenHoldings } from "@/backend/db/schema";
import { TokenHolding } from "@/backend/models/TokenHolding";

export class PortfolioRepository {
  constructor(private readonly database: Database = defaultDatabase) {}

  async findPositionsByUserId(userId: string): Promise<TokenHolding[]> {
    const holdings = await this.findActiveHoldings(userId);
    return holdings.map(toHolding);
  }

  private findActiveHoldings(userId: string) {
    return this.database.select().from(tokenHoldings)
      .where(and(
        eq(tokenHoldings.userId, userId),
        gt(tokenHoldings.quantity, 0),
      ));
  }

}

function toHolding(row: typeof tokenHoldings.$inferSelect): TokenHolding {
  return new TokenHolding({
    id: row.id,
    userId: row.userId,
    playerId: row.playerId,
    quantity: row.quantity,
    averagePurchasePrice: Number(row.averagePurchasePrice),
    updatedAt: row.updatedAt,
  });
}
