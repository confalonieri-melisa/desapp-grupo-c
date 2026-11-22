import { BusinessConflictError } from "@/backend/errors/application.error";
import {
  FinancialAuditRecord,
  type FinancialStateSnapshot,
} from "@/backend/models/FinancialAuditRecord";
import { MarketOperation } from "@/backend/models/MarketOperation";
import { TokenHolding } from "@/backend/models/TokenHolding";
import { User } from "@/backend/models/User";

export interface MarketTradeRequest {
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
  buyFromPool(request: MarketTradeRequest, state: MarketTradeState): MarketTradeOutcome {
    const operation = new MarketOperation({
      type: "BUY",
      investorId: request.investorId,
      playerId: request.playerId,
      quoteId: state.quote.id,
      quoteValue: state.quote.quoteValue,
      quantity: request.quantity,
      unit: state.quote.unit,
      correlationId: request.correlationId,
    });

    if (state.poolHolding.quantity < request.quantity) {
      throw new BusinessConflictError("Insufficient tokens in central pool");
    }
    if (!state.investor.hasSufficientBalance(operation.total)) {
      throw new BusinessConflictError("Insufficient credit balance");
    }

    const previousState = financialStateOf(
      state.investor,
      state.investorHolding,
      state.pool,
      state.poolHolding,
    );
    state.investor.debit(operation.total);
    state.pool.credit(operation.total);
    const investorHolding = state.investorHolding.buy(request.quantity, state.quote.quoteValue);
    const poolHolding = state.poolHolding.sell(request.quantity);
    const newState = financialStateOf(state.investor, investorHolding, state.pool, poolHolding);

    return {
      operation,
      audit: new FinancialAuditRecord({
        operationId: operation.id,
        actorUserId: request.investorId,
        action: "TOKEN_BUY",
        previousState,
        newState,
        correlationId: request.correlationId,
      }),
      investorHolding,
      poolHolding,
    };
  }
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
    pool: { creditBalance: pool.creditBalance, quantity: poolHolding.quantity },
  };
}
