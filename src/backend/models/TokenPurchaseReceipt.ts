import type { MarketTradeOutcome } from "@/backend/models/MarketTrade";

export interface StoredTokenPurchaseReceipt extends Record<string, unknown> {
  operation: Omit<TokenPurchaseReceipt["operation"], "createdAt"> & { createdAt: string };
  creditBalance: number;
  holding: TokenPurchaseReceipt["holding"];
}

export class TokenPurchaseReceipt {
  constructor(
    readonly operation: {
      id: string;
      type: "BUY";
      userId: string;
      playerId: string;
      quantity: number;
      quoteValue: number;
      total: number;
      createdAt: Date;
    },
    readonly creditBalance: number,
    readonly holding: { quantity: number; averagePurchasePrice: number },
  ) {}

  static fromTrade(outcome: MarketTradeOutcome, creditBalance: number): TokenPurchaseReceipt {
    return new TokenPurchaseReceipt(
      {
        id: outcome.operation.id,
        type: "BUY",
        userId: outcome.operation.investorId,
        playerId: outcome.operation.playerId,
        quantity: outcome.operation.quantity,
        quoteValue: outcome.operation.quoteValue,
        total: outcome.operation.total,
        createdAt: outcome.operation.createdAt,
      },
      creditBalance,
      {
        quantity: outcome.investorHolding.quantity,
        averagePurchasePrice: outcome.investorHolding.averagePurchasePrice,
      },
    );
  }

  toStored(): StoredTokenPurchaseReceipt {
    return {
      operation: { ...this.operation, createdAt: this.operation.createdAt.toISOString() },
      creditBalance: this.creditBalance,
      holding: this.holding,
    };
  }

  static fromStored(stored: StoredTokenPurchaseReceipt): TokenPurchaseReceipt {
    return new TokenPurchaseReceipt(
      { ...stored.operation, createdAt: new Date(stored.operation.createdAt) },
      stored.creditBalance,
      stored.holding,
    );
  }
}
