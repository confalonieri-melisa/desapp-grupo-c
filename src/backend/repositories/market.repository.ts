import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { db as defaultDatabase, type Database } from "@/backend/db";
import {
  financialAuditRecords,
  marketOperations,
  players,
  tokenHoldings,
  users,
  type FinancialAuditRecordRow,
  type MarketOperationRow,
} from "@/backend/db/schema";
import { ConflictError, NotFoundError } from "@/backend/errors/http.error";
import type {
  MarketTradeOutcome,
  MarketTradeRequest,
  MarketTradeState,
} from "@/backend/models/MarketTrade";
import { MarketOperation } from "@/backend/models/MarketOperation";
import {
  type AuditStateSnapshot,
  FinancialAuditRecord,
  type P2PFinancialStateSnapshot,
} from "@/backend/models/FinancialAuditRecord";
import { TokenHolding } from "@/backend/models/TokenHolding";
import { User } from "@/backend/models/User";
import { UserRole } from "@/backend/models/enums";
import { toUser } from "@/backend/repositories/user.repository";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";

export type MarketExecutor = Pick<Database, "select" | "insert" | "update">;
type TokenHoldingRow = typeof tokenHoldings.$inferSelect;

export interface MarketRepositoryResult {
  operation: MarketTradeOutcome["operation"];
  creditBalance: number;
  holding: TokenHolding;
}

export interface MarketOperationHistoryPage {
  rows: MarketOperationRow[];
  hasMore: boolean;
}

export interface P2PReplay {
  operation: MarketOperation;
  audit: FinancialAuditRecord<P2PFinancialStateSnapshot>;
}

export class MarketRepository {
  constructor(
    private readonly database: Database = defaultDatabase,
    private readonly valuationRepository = new ValuationRepository(database),
  ) {}

  withTransaction<T>(work: (transaction: MarketExecutor) => Promise<T>): Promise<T> {
    return this.database.transaction((transaction) => work(transaction));
  }

  async findTradeParticipants(
    transaction: MarketExecutor,
    buyerId: string,
    sellerId: string,
  ): Promise<{ buyer: User; seller: User }> {
    const rows = await transaction
      .select()
      .from(users)
      .where(inArray(users.id, [buyerId, sellerId]))
      .orderBy(asc(users.id))
      .for("update");
    const buyer = rows.find((row) => row.id === buyerId);
    const seller = rows.find((row) => row.id === sellerId);
    if (!buyer || !seller) throw new NotFoundError("Trade participant not found");
    return { buyer: toUser(buyer), seller: toUser(seller) };
  }

  async findTradeHoldings(
    transaction: MarketExecutor,
    playerId: string,
    buyerId: string,
    sellerId: string,
  ): Promise<{ buyer: TokenHolding | null; seller: TokenHolding | null }> {
    const rows = await transaction
      .select()
      .from(tokenHoldings)
      .where(
        and(eq(tokenHoldings.playerId, playerId), inArray(tokenHoldings.userId, [buyerId, sellerId])),
      )
      .orderBy(asc(tokenHoldings.userId))
      .for("update");
    const buyer = rows.find((row) => row.userId === buyerId);
    const seller = rows.find((row) => row.userId === sellerId);
    return {
      buyer: buyer ? toHolding(buyer) : null,
      seller: seller ? toHolding(seller) : null,
    };
  }

  async persistTradeParticipants(
    transaction: MarketExecutor,
    participants: User[],
  ): Promise<void> {
    for (const participant of participants) await saveAccountBalance(transaction, participant);
  }

  async persistTradeHoldings(
    transaction: MarketExecutor,
    holdings: Array<{ holding: TokenHolding; exists: boolean }>,
  ): Promise<void> {
    for (const { holding, exists } of holdings) {
      await saveTokenPosition(transaction, holding, exists);
    }
  }

  async findP2PReplay(
    transaction: MarketExecutor,
    buyerId: string,
    idempotencyKey: string,
  ): Promise<P2PReplay | undefined> {
    const operations = await transaction
      .select()
      .from(marketOperations)
      .where(
        and(
          eq(marketOperations.investorId, buyerId),
          eq(marketOperations.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    const operationRow = operations[0];
    if (!operationRow) return undefined;
    const audits = await transaction
      .select()
      .from(financialAuditRecords)
      .where(eq(financialAuditRecords.operationId, operationRow.id))
      .limit(1);
    const auditRow = audits[0];
    if (!auditRow) throw new ConflictError("P2P trade audit is missing");
    return { operation: toMarketOperation(operationRow), audit: toFinancialAuditRecord(auditRow) };
  }

  async recordCompletedTrade(
    transaction: MarketExecutor,
    operation: MarketOperation,
  ): Promise<void> {
    await saveMarketOperation(transaction, operation);
  }

  async recordFinancialTransition(
    transaction: MarketExecutor,
    audit: FinancialAuditRecord<AuditStateSnapshot>,
  ): Promise<void> {
    await saveFinancialAudit(transaction, audit);
  }

  async findOperationsByInvestorId(
    investorId: string,
    limit: number,
    offset: number,
  ): Promise<MarketOperationHistoryPage> {
    const rows = await this.database
      .select()
      .from(marketOperations)
      .where(
        or(
          eq(marketOperations.investorId, investorId),
          eq(marketOperations.buyerId, investorId),
          eq(marketOperations.sellerId, investorId),
        ),
      )
      .orderBy(desc(marketOperations.createdAt), desc(marketOperations.id))
      .limit(limit + 1)
      .offset(offset);

    return {
      rows: rows.slice(0, limit),
      hasMore: rows.length > limit,
    };
  }

  async assignInitialTokens(playerIds: string[]): Promise<void> {
    if (playerIds.length === 0) return;
    await this.database.transaction((tx) => this.assignInitialTokensInTransaction(playerIds, tx));
  }

  async assignInitialTokensInTransaction(
    playerIds: string[],
    transaction: MarketExecutor,
  ): Promise<void> {
    if (playerIds.length === 0) return;
    const poolRows = await transaction
      .select()
      .from(users)
      .where(eq(users.role, UserRole.SUPERUSER))
      .limit(1);
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

    await transaction
      .insert(tokenHoldings)
      .values(initialHoldings)
      .onConflictDoNothing({
        target: [tokenHoldings.userId, tokenHoldings.playerId],
      });
  }

  async executeTrade(
    request: MarketTradeRequest,
    applyTrade: (state: MarketTradeState) => MarketTradeOutcome,
  ): Promise<MarketRepositoryResult> {
    return this.database.transaction(async (tx) => {
      const state = await this.findTradeState(tx, request);
      const replay = await this.findIdempotentReplay(tx, request, state);
      if (replay) return replay;

      const outcome = applyTrade(state);
      return this.persistTrade(tx, state, outcome);
    });
  }

  private async findIdempotentReplay(
    tx: MarketExecutor,
    request: MarketTradeRequest,
    state: MarketTradeState,
  ): Promise<MarketRepositoryResult | undefined> {
    const existingOperation = await this.findExistingOperation(tx, request);
    if (!existingOperation) return undefined;

    const operation = toMarketOperation(existingOperation);
    if (!operation.matchesOrder(request.type, request.playerId, request.quantity)) {
      throw new ConflictError("Idempotency key already used for another order");
    }

    return {
      operation,
      creditBalance: state.investor.creditBalance,
      holding: state.investorHolding,
    };
  }

  private async persistTrade(
    tx: MarketExecutor,
    state: MarketTradeState,
    outcome: MarketTradeOutcome,
  ): Promise<MarketRepositoryResult> {
    await this.saveTrade(tx, state, outcome);
    return {
      operation: outcome.operation,
      creditBalance: state.investor.creditBalance,
      holding: outcome.investorHolding,
    };
  }

  private async findExistingOperation(
    tx: MarketExecutor,
    request: MarketTradeRequest,
  ): Promise<MarketOperationRow | undefined> {
    if (!request.idempotencyKey) return undefined;

    const rows = await tx
      .select()
      .from(marketOperations)
      .where(
        and(
          eq(marketOperations.investorId, request.investorId),
          eq(marketOperations.idempotencyKey, request.idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0];
  }

  async findTradeState(tx: MarketExecutor, request: MarketTradeRequest): Promise<MarketTradeState> {
    await this.requirePlayer(tx, request.playerId);

    const investorRow = await this.lockInvestorAccount(tx, request.investorId);
    const poolRow = await this.lockPoolAccount(tx);
    const quote = await this.valuationRepository.findLatestForPlayer(request.playerId, tx);
    if (!quote) throw new NotFoundError("Current quote not available");

    const positions = await this.lockTokenPositions(
      tx,
      request.playerId,
      request.investorId,
      poolRow.id,
    );
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

  async saveTrade(
    tx: MarketExecutor,
    state: MarketTradeState,
    outcome: MarketTradeOutcome,
  ): Promise<void> {
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
    const rows = await tx
      .select()
      .from(users)
      .where(eq(users.id, investorId))
      .orderBy(asc(users.id))
      .for("update");
    const investor = rows[0];
    if (!investor) throw new NotFoundError("Investor not found");
    return investor;
  }

  private async lockPoolAccount(tx: MarketExecutor) {
    const rows = await tx
      .select()
      .from(users)
      .where(eq(users.role, UserRole.SUPERUSER))
      .orderBy(asc(users.id))
      .for("update");
    return rows[0]!;
  }

  private async lockTokenPositions(
    tx: MarketExecutor,
    playerId: string,
    investorId: string,
    poolId: string,
  ) {
    return tx
      .select()
      .from(tokenHoldings)
      .where(
        and(
          eq(tokenHoldings.playerId, playerId),
          inArray(tokenHoldings.userId, [investorId, poolId]),
        ),
      )
      .orderBy(asc(tokenHoldings.userId))
      .for("update");
  }

  private findPositionForUser(positions: TokenHoldingRow[], userId: string) {
    return positions.find((position) => position.userId === userId);
  }
}

async function saveAccountBalance(tx: MarketExecutor, user: User): Promise<void> {
  await tx
    .update(users)
    .set({
      creditBalance: user.creditBalance.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
}

async function saveTokenPosition(
  tx: MarketExecutor,
  holding: TokenHolding,
  exists: boolean,
): Promise<void> {
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

async function saveMarketOperation(
  tx: MarketExecutor,
  operation: MarketTradeOutcome["operation"],
): Promise<void> {
  await tx.insert(marketOperations).values({
    id: operation.id,
    type: operation.type,
    investorId: operation.investorId,
    playerId: operation.playerId,
    quoteId: operation.quoteId,
    buyerId: operation.buyerId,
    sellerId: operation.sellerId,
    offerId: operation.offerId,
    quoteValue: operation.quoteValue.toFixed(2),
    quantity: operation.quantity,
    total: operation.total.toFixed(2),
    unit: operation.unit,
    correlationId: operation.correlationId,
    idempotencyKey: operation.idempotencyKey,
    createdAt: operation.createdAt,
  });
}

async function saveFinancialAudit(
  tx: MarketExecutor,
  audit: FinancialAuditRecord<AuditStateSnapshot>,
): Promise<void> {
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

export function toMarketOperation(row: MarketOperationRow): MarketOperation {
  return new MarketOperation({
    id: row.id,
    type: row.type as "BUY" | "SELL",
    investorId: row.investorId,
    playerId: row.playerId,
    quoteId: row.quoteId ?? undefined,
    buyerId: row.buyerId ?? undefined,
    sellerId: row.sellerId ?? undefined,
    offerId: row.offerId ?? undefined,
    quoteValue: Number(row.quoteValue),
    quantity: row.quantity,
    unit: row.unit,
    correlationId: row.correlationId ?? undefined,
    idempotencyKey: row.idempotencyKey ?? undefined,
    createdAt: row.createdAt,
  });
}

function toFinancialAuditRecord(
  row: FinancialAuditRecordRow,
): FinancialAuditRecord<P2PFinancialStateSnapshot> {
  return new FinancialAuditRecord<P2PFinancialStateSnapshot>({
    id: row.id,
    operationId: row.operationId,
    actorUserId: row.actorUserId,
    action: row.action as "TOKEN_BUY" | "TOKEN_SELL" | "P2P_TRADE",
    previousState: row.previousState as P2PFinancialStateSnapshot,
    newState: row.newState as P2PFinancialStateSnapshot,
    correlationId: row.correlationId ?? undefined,
    createdAt: row.createdAt,
  });
}
