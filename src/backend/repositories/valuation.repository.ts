import { and, desc, eq, lt } from "drizzle-orm";
import { db as defaultDatabase, type Database } from "@/backend/db";
import {
  playerQuotes,
  valuationStrategyVersions,
} from "@/backend/db/schema";
import type {
  PlayerQuoteSnapshot,
  ValuationConfig,
  ValuationStrategyCode,
} from "@/backend/models/valuation";

type ValuationTransaction = Pick<Database, "select" | "insert" | "update">;
type ValuationReader = Pick<Database, "select">;

export class ValuationRepository {
  constructor(private readonly database: Database = defaultDatabase) {}

  async findActiveStrategyVersion() {
    const rows = await this.database.select().from(valuationStrategyVersions)
      .where(eq(valuationStrategyVersions.isActive, 1)).limit(1);
    return rows[0] ?? null;
  }

  async activateStrategyVersion(
    strategyCode: ValuationStrategyCode,
    version: string,
    configuration: ValuationConfig,
    createdBy: string,
  ) {
    return this.database.transaction(async (tx) => {
      await this.deactivateAll(tx);
      const row = await this.findOrCreateVersion(tx, strategyCode, version, configuration, createdBy);
      return this.activateVersion(tx, row.id);
    });
  }

  private deactivateAll(tx: ValuationTransaction) {
    return tx.update(valuationStrategyVersions).set({ isActive: 0, activatedAt: null });
  }

  private async findOrCreateVersion(
    tx: ValuationTransaction,
    strategyCode: ValuationStrategyCode,
    version: string,
    configuration: ValuationConfig,
    createdBy: string,
  ) {
    const existing = await tx.select().from(valuationStrategyVersions)
      .where(and(
        eq(valuationStrategyVersions.strategyCode, strategyCode),
        eq(valuationStrategyVersions.version, version),
      ))
      .limit(1);
    if (existing[0]) return existing[0];
    const created = await tx.insert(valuationStrategyVersions).values({
      strategyCode, version, configuration, createdBy,
    }).returning();
    if (!created[0]) throw new Error("Valuation version could not be created");
    return created[0];
  }

  private async activateVersion(tx: ValuationTransaction, id: string) {
    const activated = await tx.update(valuationStrategyVersions)
      .set({ isActive: 1, activatedAt: new Date() })
      .where(eq(valuationStrategyVersions.id, id))
      .returning();
    return activated[0];
  }

  async saveQuote(input: {
    playerId: string; strategyVersionId: string; individualScore: number;
    teamScore: number | null; finalScore: number; quoteValue: number;
    contextUpdateId?: string; explanation: unknown;
  }) {
    const rows = await this.database.insert(playerQuotes).values({
      playerId: input.playerId,
      strategyVersionId: input.strategyVersionId,
      individualScore: String(input.individualScore),
      teamScore: input.teamScore === null ? null : String(input.teamScore),
      finalScore: String(input.finalScore),
      quoteValue: String(input.quoteValue),
      contextUpdateId: input.contextUpdateId,
      explanation: input.explanation,
    }).returning();
    return rows[0];
  }

  async findHistoryByPlayerId(playerId: string): Promise<PlayerQuoteSnapshot[]> {
    const rows = await this.database
      .select({
        quote: playerQuotes,
        strategyCode: valuationStrategyVersions.strategyCode,
        strategyVersion: valuationStrategyVersions.version,
      })
      .from(playerQuotes)
      .innerJoin(
        valuationStrategyVersions,
        eq(playerQuotes.strategyVersionId, valuationStrategyVersions.id),
      )
      .where(eq(playerQuotes.playerId, playerId))
      .orderBy(desc(playerQuotes.calculatedAt), desc(playerQuotes.id));

    return rows.map(toPlayerQuoteSnapshot);
  }

  async findLatestQuoteBefore(playerId: string, upperBound: Date): Promise<PlayerQuoteSnapshot | null> {
    const rows = await this.database
      .select({
        quote: playerQuotes,
        strategyCode: valuationStrategyVersions.strategyCode,
        strategyVersion: valuationStrategyVersions.version,
      })
      .from(playerQuotes)
      .innerJoin(
        valuationStrategyVersions,
        eq(playerQuotes.strategyVersionId, valuationStrategyVersions.id),
      )
      .where(and(
        eq(playerQuotes.playerId, playerId),
        lt(playerQuotes.calculatedAt, upperBound),
      ))
      .orderBy(desc(playerQuotes.calculatedAt), desc(playerQuotes.id))
      .limit(1);

    return rows[0] ? toPlayerQuoteSnapshot(rows[0]) : null;
  }

  async findLatestForPlayer(
    playerId: string,
    executor: ValuationReader = this.database,
  ): Promise<PlayerQuoteSnapshot | null> {
    const rows = await executor
      .select({
        quote: playerQuotes,
        strategyCode: valuationStrategyVersions.strategyCode,
        strategyVersion: valuationStrategyVersions.version,
      })
      .from(playerQuotes)
      .innerJoin(
        valuationStrategyVersions,
        eq(playerQuotes.strategyVersionId, valuationStrategyVersions.id),
      )
      .where(eq(playerQuotes.playerId, playerId))
      .orderBy(desc(playerQuotes.calculatedAt), desc(playerQuotes.id))
      .limit(1);

    return rows[0] ? toPlayerQuoteSnapshot(rows[0]) : null;
  }
}

function toPlayerQuoteSnapshot(row: {
  quote: typeof playerQuotes.$inferSelect;
  strategyCode: string;
  strategyVersion: string;
}): PlayerQuoteSnapshot {
  return {
    id: row.quote.id,
    playerId: row.quote.playerId,
    individualScore: Number(row.quote.individualScore),
    teamScore: row.quote.teamScore === null ? null : Number(row.quote.teamScore),
    finalScore: Number(row.quote.finalScore),
    quoteValue: Number(row.quote.quoteValue),
    unit: row.quote.unit,
    calculatedAt: row.quote.calculatedAt,
    strategyCode: row.strategyCode as ValuationStrategyCode,
    strategyVersion: row.strategyVersion,
    explanation: row.quote.explanation as PlayerQuoteSnapshot["explanation"],
  };
}
