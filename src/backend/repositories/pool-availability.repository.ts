import { and, asc, eq } from "drizzle-orm";
import { db, type Database } from "@/backend/db";
import { users, tokenHoldings } from "@/backend/db/schema";
import { UserRole } from "@/backend/models/enums";
import { NotFoundError } from "@/backend/errors/http.error";
export class PoolAvailabilityRepository {
  constructor(private readonly database: Database = db) {}
  async getAvailableQuantity(playerId: string): Promise<number> {
    const [pool] = await this.database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, UserRole.SUPERUSER))
      .orderBy(asc(users.id))
      .limit(1);
    if (!pool) throw new NotFoundError("Pool not found");
    const [holding] = await this.database
      .select({ quantity: tokenHoldings.quantity })
      .from(tokenHoldings)
      .where(and(eq(tokenHoldings.userId, pool.id), eq(tokenHoldings.playerId, playerId)))
      .limit(1);
    return holding?.quantity ?? 0;
  }
}
