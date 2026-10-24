import { and, asc, eq, inArray } from "drizzle-orm";
import { db as defaultDatabase, type Database } from "@/backend/db";
import { financialAuditRecords, marketOperations, players, tokenHoldings, users } from "@/backend/db/schema";
import { NotFoundError } from "@/backend/errors/http.error";
import type { MarketTradeOutcome, MarketTradeRequest, MarketTradeState } from "@/backend/models/MarketTrade";
import { TokenHolding } from "@/backend/models/TokenHolding";
import { User } from "@/backend/models/User";
import { UserRole } from "@/backend/models/enums";
import { toUser } from "@/backend/repositories/user.repository";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";

export type MarketExecutor = Pick<Database, "select" | "insert" | "update">;
type TokenHoldingRow = typeof tokenHoldings.$inferSelect;

export interface MarketRepositoryResult {
  outcome: MarketTradeOutcome;
  creditBalance: number;
}

export class MarketRepository {
  constructor(
    private readonly database: Database = defaultDatabase,
    private readonly valuationRepository = new ValuationRepository(database),
  ) {}

  async assignInitialTokens(playerIds: string[]): Promise<void> {
    if (playerIds.length === 0) return;

    await this.database.transaction(async (tx) => {
      const poolRows = await tx.select().from(users)
        .where(eq(users.role, UserRole.SUPERUSER)).limit(1);
      const pool = poolRows[0]!;

      const initialHoldings = playerIds.map((playerId) => {
        const holding = TokenHolding.initialSeed(pool.id, playerId);
        return {
          id: holding.id,
          userId: holding.userId,
          playerId: holding.playerId,
          quantity: holding.quantity,
          averagePurchasePrice: holding.averagePurchasePrice.toFixed(2),
        };
      });

      await tx.insert(tokenHoldings)
        .values(initialHoldings)
        .onConflictDoNothing({
          target: [tokenHoldings.userId, tokenHoldings.playerId],
        });
    });
  }

  async executeTrade(
    request: MarketTradeRequest,
    applyTrade: (state: MarketTradeState) => MarketTradeOutcome,
  ): Promise<MarketRepositoryResult> {
    return this.database.transaction(async (tx) => {
      const state = await this.findTradeState(tx, request);
      const outcome = applyTrade(state);
      await this.saveTrade(tx, state, outcome);
      return { outcome, creditBalance: state.investor.creditBalance };
    });
  }

  async findTradeState(tx: MarketExecutor, request: MarketTradeRequest): Promise<MarketTradeState> {
    await this.requirePlayer(tx, request.playerId);

    const investorRow = await this.lockInvestorAccount(tx, request.investorId);
    const poolRow = await this.lockPoolAccount(tx);
    const quote = await this.valuationRepository.findLatestForPlayer(request.playerId, tx);
    if (!quote) throw new NotFoundError("Current quote not available");

    const positions = await this.lockTokenPositions(tx, request.playerId, request.investorId, poolRow.id);
    const investorPosition = this.findPositionForUser(positions, request.investorId);
    const poolPosition = this.findPositionForUser(positions, poolRow.id)!;

    return {
      investor: toUser(investorRow),
      pool: toUser(poolRow),
      investorHolding: investorPosition
        ? toHolding(investorPosition)
        : createEmptyPosition(request.investorId, request.playerId),
      poolHolding: toHolding(poolPosition),
      investorHoldingExists: Boolean(investorPosition),
      quote,
    };
  }

  async saveTrade(tx: MarketExecutor, state: MarketTradeState, outcome: MarketTradeOutcome): Promise<void> {
    await saveAccountBalance(tx, state.investor);
    await saveAccountBalance(tx, state.pool);
    await saveTokenPosition(tx, outcome.investorHolding, state.investorHoldingExists);
    await saveTokenPosition(tx, outcome.poolHolding, true);
    await saveMarketOperation(tx, outcome.operation);
    await saveFinancialAudit(tx, outcome.audit);
  }

  private async requirePlayer(tx: MarketExecutor, playerId: string): Promise<void> {
    const rows = await tx.select().from(players).where(eq(players.id, playerId)).limit(1);
    if (!rows[0]) throw new NotFoundError("Player not found");
  }

  private async lockInvestorAccount(tx: MarketExecutor, investorId: string) {
    const rows = await tx.select().from(users)
      .where(eq(users.id, investorId)).orderBy(asc(users.id)).for("update");
    const investor = rows[0];
    if (!investor) throw new NotFoundError("Investor not found");
    return investor;
  }

  private async lockPoolAccount(tx: MarketExecutor) {
    const rows = await tx.select().from(users)
      .where(eq(users.role, UserRole.SUPERUSER)).orderBy(asc(users.id)).for("update");
    return rows[0]!;
  }

  private async lockTokenPositions(
    tx: MarketExecutor,
    playerId: string,
    investorId: string,
    poolId: string,
  ) {
    return tx.select().from(tokenHoldings)
      .where(and(
        eq(tokenHoldings.playerId, playerId),
        inArray(tokenHoldings.userId, [investorId, poolId]),
      ))
      .orderBy(asc(tokenHoldings.userId)).for("update");
  }

  private findPositionForUser(positions: TokenHoldingRow[], userId: string) {
    return positions.find((position) => position.userId === userId);
  }
}

async function saveAccountBalance(tx: MarketExecutor, user: User): Promise<void> {
  await tx.update(users).set({
    creditBalance: user.creditBalance.toFixed(2),
    updatedAt: new Date(),
  }).where(eq(users.id, user.id));
}

async function saveTokenPosition(tx: MarketExecutor, holding: TokenHolding, exists: boolean): Promise<void> {
  const values = {
    quantity: holding.quantity,
    averagePurchasePrice: holding.averagePurchasePrice.toFixed(2),
    updatedAt: new Date(),
  };
  if (exists) {
    await tx.update(tokenHoldings).set(values).where(eq(tokenHoldings.id, holding.id));
    return;
  }
  await tx.insert(tokenHoldings).values({
    id: holding.id,
    userId: holding.userId,
    playerId: holding.playerId,
    ...values,
  });
}

async function saveMarketOperation(tx: MarketExecutor, operation: MarketTradeOutcome["operation"]): Promise<void> {
  await tx.insert(marketOperations).values({
    id: operation.id,
    type: operation.type,
    investorId: operation.investorId,
    playerId: operation.playerId,
    quoteId: operation.quoteId,
    quoteValue: operation.quoteValue.toFixed(2),
    quantity: operation.quantity,
    total: operation.total.toFixed(2),
    unit: operation.unit,
    correlationId: operation.correlationId,
    createdAt: operation.createdAt,
  });
}

async function saveFinancialAudit(tx: MarketExecutor, audit: MarketTradeOutcome["audit"]): Promise<void> {
  await tx.insert(financialAuditRecords).values({
    id: audit.id,
    operationId: audit.operationId,
    actorUserId: audit.actorUserId,
    action: audit.action,
    previousState: audit.previousState,
    newState: audit.newState,
    correlationId: audit.correlationId,
    createdAt: audit.createdAt,
  });
}

function createEmptyPosition(userId: string, playerId: string): TokenHolding {
  return new TokenHolding({ userId, playerId, quantity: 0, averagePurchasePrice: 0 });
}

function toHolding(row: TokenHoldingRow): TokenHolding {
  return new TokenHolding({
    id: row.id,
    userId: row.userId,
    playerId: row.playerId,
    quantity: row.quantity,
    averagePurchasePrice: Number(row.averagePurchasePrice),
    updatedAt: row.updatedAt,
  });
}
