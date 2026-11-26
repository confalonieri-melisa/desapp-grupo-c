import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, databaseForReservedConnection, postgresClient, type Database } from "@/backend/db";
import { batchTurns, rankingPublicationRevision } from "@/backend/db/schema";
import type {
  BatchCounts,
  BatchOccurrence,
  BatchOrigin,
  BatchProcess,
} from "@/backend/models/batch-job";

export type BatchTurnRow = typeof batchTurns.$inferSelect;
type BatchWriter = Pick<Database, "update">;
const RANKING_PUBLICATION_REVISION_ROW_ID = 1;
const GLOBAL_LOCK_CLASS = 83117;
const GLOBAL_LOCK_ID = 1;

export class BatchJobRepository {
  constructor(private readonly database: Database = db) {}

  async getRankingPublicationRevision(): Promise<number> {
    const rows = await this.database
      .select({ revision: rankingPublicationRevision.revision })
      .from(rankingPublicationRevision)
      .where(eq(rankingPublicationRevision.id, RANKING_PUBLICATION_REVISION_ROW_ID));
    if (!rows[0]) throw new Error("Ranking publication revision is missing");
    return rows[0].revision;
  }

  async withLock<T>(
    action: (session: Database) => Promise<T>,
  ): Promise<{ acquired: true; value: T } | { acquired: false }> {
    const connection = await postgresClient.reserve();
    let acquired = false;
    try {
      const rows = await connection<
        { locked: boolean }[]
      >`select pg_try_advisory_lock(${GLOBAL_LOCK_CLASS}, ${GLOBAL_LOCK_ID}) as locked`;
      acquired = rows[0]?.locked === true;
      if (!acquired) return { acquired: false };
      return { acquired: true, value: await action(databaseForReservedConnection(connection)) };
    } finally {
      try {
        if (acquired)
          await connection`select pg_advisory_unlock(${GLOBAL_LOCK_CLASS}, ${GLOBAL_LOCK_ID})`;
      } finally {
        connection.release();
      }
    }
  }

  async createScheduledTurn(
    process: BatchProcess,
    occurrence: BatchOccurrence,
  ): Promise<BatchTurnRow | null> {
    const rows = await this.database
      .insert(batchTurns)
      .values({
        process,
        origin: "SCHEDULED",
        scheduledLocal: occurrence.scheduledLocal,
        scheduledFor: occurrence.scheduledFor,
        timezone: occurrence.timezone,
        correlationId: randomUUID(),
      })
      .onConflictDoNothing()
      .returning();
    return rows[0] ?? null;
  }

  async createManualTurn(
    process: BatchProcess,
    origin: Extract<BatchOrigin, "MANUAL_API" | "MANUAL_CLI">,
    correlationId: string = randomUUID(),
  ): Promise<BatchTurnRow> {
    const now = new Date();
    const rows = await this.database
      .insert(batchTurns)
      .values({
        process,
        origin,
        scheduledLocal: now.toISOString().slice(0, 19),
        scheduledFor: now,
        timezone: "UTC",
        correlationId,
      })
      .returning();
    return rows[0]!;
  }

  async pendingScheduledTurns(): Promise<BatchTurnRow[]> {
    return this.database
      .select()
      .from(batchTurns)
      .where(and(eq(batchTurns.status, "PENDING"), eq(batchTurns.origin, "SCHEDULED")))
      .orderBy(asc(batchTurns.scheduledFor));
  }

  async turnById(id: string): Promise<BatchTurnRow | null> {
    const rows = await this.database
      .select()
      .from(batchTurns)
      .where(eq(batchTurns.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async setTurnRunning(id: string): Promise<BatchTurnRow | null> {
    const rows = await this.database
      .update(batchTurns)
      .set({ status: "RUNNING", startedAt: new Date() })
      .where(and(eq(batchTurns.id, id), eq(batchTurns.status, "PENDING")))
      .returning();
    return rows[0] ?? null;
  }

  async finishTurn(
    id: string,
    status: "COMPLETED" | "PARTIAL" | "FAILED",
    counts: BatchCounts,
    reasonCode?: string,
    writer?: BatchWriter,
  ): Promise<void> {
    if (!writer && status !== "FAILED" && counts.succeeded > 0) {
      await this.database.transaction((tx) => this.finishTurn(id, status, counts, reasonCode, tx));
      return;
    }
    const executor = writer ?? this.database;
    const finished = await executor
      .update(batchTurns)
      .set({
        status,
        finishedAt: new Date(),
        processedCount: counts.processed,
        succeededCount: counts.succeeded,
        rejectedCount: counts.rejected,
        reasonCode,
      })
      .where(and(eq(batchTurns.id, id), eq(batchTurns.status, "RUNNING")))
      .returning({ id: batchTurns.id });
    if (finished.length > 0 && this.shouldAdvanceRankingRevision(status, counts))
      await this.advanceRankingPublicationRevision(executor);
  }

  private shouldAdvanceRankingRevision(
    status: "COMPLETED" | "PARTIAL" | "FAILED",
    counts: BatchCounts,
  ): boolean {
    return status !== "FAILED" && counts.succeeded > 0;
  }

  private async advanceRankingPublicationRevision(writer: BatchWriter): Promise<void> {
    const updated = await writer
      .update(rankingPublicationRevision)
      .set({ revision: sql`${rankingPublicationRevision.revision} + 1` })
      .where(eq(rankingPublicationRevision.id, RANKING_PUBLICATION_REVISION_ROW_ID))
      .returning({ id: rankingPublicationRevision.id });
    if (updated.length === 0) throw new Error("Ranking publication revision is missing");
  }

  async rejectManualTurn(id: string): Promise<void> {
    await this.database
      .update(batchTurns)
      .set({ status: "FAILED", finishedAt: new Date(), reasonCode: "BATCH_CONFLICT" })
      .where(and(eq(batchTurns.id, id), eq(batchTurns.status, "PENDING")));
  }

  async failAbandonedTurns(): Promise<void> {
    await this.database
      .update(batchTurns)
      .set({ status: "FAILED", finishedAt: new Date(), reasonCode: "INTERRUPTED" })
      .where(eq(batchTurns.status, "RUNNING"));
  }
}
