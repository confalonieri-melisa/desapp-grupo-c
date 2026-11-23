import { ConflictError } from "@/backend/errors/http.error";
import { FinancialAuditRecord } from "@/backend/models/FinancialAuditRecord";
import type { P2PFinancialStateSnapshot } from "@/backend/models/FinancialAuditRecord";
import { MarketOperation } from "@/backend/models/MarketOperation";
import { P2POffer } from "@/backend/models/P2POffer";
import { TokenHolding } from "@/backend/models/TokenHolding";
import { InsufficientTokenHoldingError } from "@/backend/models/errors";
import { User } from "@/backend/models/User";

export interface P2PTradeResult {
  operation: MarketOperation;
  audit: FinancialAuditRecord<P2PFinancialStateSnapshot>;
  buyerHolding: TokenHolding;
  sellerHolding: TokenHolding;
}

export class P2PTrade {
  complete(
    offer: P2POffer,
    buyer: User,
    seller: User,
    buyerHolding: TokenHolding,
    sellerHolding: TokenHolding,
    correlationId?: string,
    idempotencyKey?: string,
  ): P2PTradeResult {
    const total = this.calculateTotal(offer);
    this.ensureTradeCanBeCompleted(buyer, seller, sellerHolding, offer, total);

    const previousState = stateOf(buyer, buyerHolding, seller, sellerHolding);

    this.transferCredits(buyer, seller, total);
    const updatedHoldings = this.transferTokens(buyerHolding, sellerHolding, offer);
    const operation = this.createOperation(offer, buyer, seller, correlationId, idempotencyKey);

    const audit = this.createAudit(
      operation,
      buyer,
      previousState,
      stateOf(buyer, updatedHoldings.buyer, seller, updatedHoldings.seller),
      correlationId,
    );

    return {
      operation,
      audit,
      buyerHolding: updatedHoldings.buyer,
      sellerHolding: updatedHoldings.seller,
    };
  }

  private calculateTotal(offer: P2POffer): number {
    return roundMoney(offer.quantity * offer.unitPrice);
  }

  private ensureTradeCanBeCompleted(
    buyer: User,
    seller: User,
    sellerHolding: TokenHolding,
    offer: P2POffer,
    total: number,
  ): void {
    if (buyer.id === seller.id) throw new ConflictError("Cannot accept your own offer");

    if (!sellerHolding.canSell(offer.quantity)) throw new InsufficientTokenHoldingError();

    if (!buyer.hasSufficientBalance(total)) {
      throw new ConflictError("Insufficient credit balance");
    }
  }

  private transferCredits(buyer: User, seller: User, total: number): void {
    buyer.debit(total);
    seller.credit(total);
  }

  private transferTokens(
    buyerHolding: TokenHolding,
    sellerHolding: TokenHolding,
    offer: P2POffer,
  ): { buyer: TokenHolding; seller: TokenHolding } {
    return {
      buyer: buyerHolding.buy(offer.quantity, offer.unitPrice),
      seller: sellerHolding.sell(offer.quantity),
    };
  }

  private createOperation(
    offer: P2POffer,
    buyer: User,
    seller: User,
    correlationId?: string,
    idempotencyKey?: string,
  ): MarketOperation {
    return new MarketOperation({
      type: "BUY",
      investorId: buyer.id,
      buyerId: buyer.id,
      sellerId: seller.id,
      offerId: offer.id,
      playerId: offer.playerId,
      quoteValue: offer.unitPrice,
      quantity: offer.quantity,
      unit: "CREDIT_PER_TOKEN",
      correlationId,
      idempotencyKey,
    });
  }

  private createAudit(
    operation: MarketOperation,
    buyer: User,
    previousState: P2PFinancialStateSnapshot,
    newState: P2PFinancialStateSnapshot,
    correlationId?: string,
  ): FinancialAuditRecord<P2PFinancialStateSnapshot> {
    return new FinancialAuditRecord<P2PFinancialStateSnapshot>({
      operationId: operation.id,
      actorUserId: buyer.id,
      action: "P2P_TRADE",
      previousState,
      newState,
      correlationId,
    });
  }
}

function stateOf(
  buyer: User,
  buyerHolding: TokenHolding,
  seller: User,
  sellerHolding: TokenHolding,
) {
  return {
    buyer: {
      creditBalance: buyer.creditBalance,
      quantity: buyerHolding.quantity,
      averagePurchasePrice: buyerHolding.averagePurchasePrice,
    },
    seller: {
      creditBalance: seller.creditBalance,
      quantity: sellerHolding.quantity,
      averagePurchasePrice: sellerHolding.averagePurchasePrice,
    },
  };
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
