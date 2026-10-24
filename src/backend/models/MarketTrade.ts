import { ConflictError } from "@/backend/errors/http.error";
import { FinancialAuditRecord, type FinancialStateSnapshot } from "@/backend/models/FinancialAuditRecord";
import { MarketOperation, type MarketOperationType } from "@/backend/models/MarketOperation";
import { TokenHolding } from "@/backend/models/TokenHolding";
import { User } from "@/backend/models/User";
import { UserRole } from "@/backend/models/enums";

export interface MarketTradeRequest {
  type: MarketOperationType;
  investorId: string;
  playerId: string;
  quantity: number;
  correlationId?: string;
}

export interface MarketQuote {
  id: string;
  quoteValue: number;
  unit: string;
}

export interface MarketTradeState {
  investor: User;
  pool: User;
  investorHolding: TokenHolding;
  poolHolding: TokenHolding;
  investorHoldingExists: boolean;
  quote: MarketQuote;
}

export interface MarketTradeOutcome {
  operation: MarketOperation;
  audit: FinancialAuditRecord;
  investorHolding: TokenHolding;
  poolHolding: TokenHolding;
}

export class MarketTrade {
  buy(request: MarketTradeRequest, state: MarketTradeState): MarketTradeOutcome {
    this.ensureInvestorCanTrade(state);
    const operation = this.createOperation(request, state);
    return this.completeTrade(request, state, operation, this.investorBuysFromPool(request, state, operation.total));
  }

  sell(request: MarketTradeRequest, state: MarketTradeState): MarketTradeOutcome {
    this.ensureInvestorCanTrade(state);
    const operation = this.createOperation(request, state);
    return this.completeTrade(request, state, operation, this.investorSellsToPool(request, state, operation.total));
  }

  private completeTrade(
    request: MarketTradeRequest,
    state: MarketTradeState,
    operation: MarketOperation,
    updatedPositions: UpdatedPositions,
  ): MarketTradeOutcome {
    const previousState = financialStateOf(
      state.investor,
      state.investorHolding,
      state.pool,
      state.poolHolding,
    );
    return {
      operation,
      audit: new FinancialAuditRecord({
        operationId: operation.id,
        actorUserId: request.investorId,
        action: request.type === "BUY" ? "TOKEN_BUY" : "TOKEN_SELL",
        previousState,
        newState: financialStateOf(
          state.investor,
          updatedPositions.investorHolding,
          state.pool,
          updatedPositions.poolHolding,
        ),
        correlationId: request.correlationId,
      }),
      ...updatedPositions,
    };
  }

  private createOperation(request: MarketTradeRequest, state: MarketTradeState): MarketOperation {
    return new MarketOperation({
      type: request.type,
      investorId: request.investorId,
      playerId: request.playerId,
      quoteId: state.quote.id,
      quoteValue: state.quote.quoteValue,
      quantity: request.quantity,
      unit: state.quote.unit,
      correlationId: request.correlationId,
    });
  }

  private ensureInvestorCanTrade(state: MarketTradeState): void {
    if (state.investor.role === UserRole.SUPERUSER) {
      throw new ConflictError("The central pool cannot operate as an investor");
    }
  }

  private investorBuysFromPool(request: MarketTradeRequest, state: MarketTradeState, total: number): UpdatedPositions {
    if (state.poolHolding.quantity < request.quantity) {
      throw new ConflictError("Insufficient tokens in central pool");
    }
    if (!state.investor.hasSufficientBalance(total)) {
      throw new ConflictError("Insufficient credit balance");
    }

    state.investor.debit(total);
    state.pool.credit(total);
    return {
      investorHolding: state.investorHolding.buy(request.quantity, state.quote.quoteValue),
      poolHolding: state.poolHolding.sell(request.quantity),
    };
  }

  private investorSellsToPool(request: MarketTradeRequest, state: MarketTradeState, total: number): UpdatedPositions {
    if (!state.investorHoldingExists || state.investorHolding.quantity < request.quantity) {
      throw new ConflictError("Insufficient token holding");
    }
    if (state.pool.creditBalance < total) {
      throw new ConflictError("Insufficient central pool balance");
    }

    state.investor.credit(total);
    state.pool.debit(total);
    return {
      investorHolding: state.investorHolding.sell(request.quantity),
      poolHolding: state.poolHolding.buy(request.quantity, state.quote.quoteValue),
    };
  }
}

interface UpdatedPositions {
  investorHolding: TokenHolding;
  poolHolding: TokenHolding;
}

function financialStateOf(
  investor: User,
  investorHolding: TokenHolding,
  pool: User,
  poolHolding: TokenHolding,
): FinancialStateSnapshot {
  return {
    investor: {
      creditBalance: investor.creditBalance,
      quantity: investorHolding.quantity,
      averagePurchasePrice: investorHolding.averagePurchasePrice,
    },
    pool: {
      creditBalance: pool.creditBalance,
      quantity: poolHolding.quantity,
    },
  };
}
