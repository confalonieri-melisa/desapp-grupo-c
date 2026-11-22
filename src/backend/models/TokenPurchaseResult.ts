import type { MarketTradeOutcome } from "@/backend/models/MarketTrade";

export interface TokenPurchaseResult extends Record<string, unknown> {
  operation: {
    id: string;
    type: "BUY";
    userId: string;
    playerId: string;
    quantity: number;
    quoteValue: number;
    total: number;
    createdAt: string;
  };
  creditBalance: number;
  holding: { quantity: number; averagePurchasePrice: number };
}

export function tokenPurchaseResultFromTrade(
  outcome: MarketTradeOutcome,
  creditBalance: number,
): TokenPurchaseResult {
  return {
    operation: {
      id: outcome.operation.id,
      type: "BUY",
      userId: outcome.operation.investorId,
      playerId: outcome.operation.playerId,
      quantity: outcome.operation.quantity,
      quoteValue: outcome.operation.quoteValue,
      total: outcome.operation.total,
      createdAt: outcome.operation.createdAt.toISOString(),
    },
    creditBalance,
    holding: {
      quantity: outcome.investorHolding.quantity,
      averagePurchasePrice: outcome.investorHolding.averagePurchasePrice,
    },
  };
}
