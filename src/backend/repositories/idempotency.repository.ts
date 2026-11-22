import { and, eq } from "drizzle-orm";
import { idempotencyKeys } from "@/backend/db/schema";
import { IdempotencyConflictError } from "@/backend/errors/application.error";

export interface BuyIdempotencyRequest {
  key: string;
  playerId: string;
  quantity: number;
}

export type IdempotencyRecord<T extends Record<string, unknown>> = Omit<
  typeof idempotencyKeys.$inferSelect,
  "responseBody"
> & { responseBody: T | null };

type IdempotencyExecutor = Pick<typeof import("@/backend/db").db, "select" | "insert" | "update">;

export class IdempotencyRepository {
  async claim<T extends Record<string, unknown>>(tx: IdempotencyExecutor, userId: string, request: BuyIdempotencyRequest): Promise<IdempotencyRecord<T>> {
    await tx
      .insert(idempotencyKeys)
      .values({ userId, ...request })
      .onConflictDoNothing({ target: [idempotencyKeys.userId, idempotencyKeys.key] });

    const rows = await tx
      .select()
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.userId, userId), eq(idempotencyKeys.key, request.key)))
      .for("update");

    const record = rows[0]!;
    if (record.playerId !== request.playerId || record.quantity !== request.quantity) {
      throw new IdempotencyConflictError("Idempotency-Key was already used with a different buy");
    }
    return record as IdempotencyRecord<T>;
  }

  complete<T extends Record<string, unknown>>(tx: IdempotencyExecutor, id: string, responseBody: T) {
    return tx.update(idempotencyKeys).set({ responseBody }).where(eq(idempotencyKeys.id, id));
  }
}
