import type { AuthTokenPayload } from "@/backend/utils/jwt";
import { ConflictError, ForbiddenError, NotFoundError } from "@/backend/errors/http.error";
import { P2PTrade, type P2PTradeResult } from "@/backend/models/P2PTrade";
import { InsufficientTokenHoldingError } from "@/backend/models/errors";
import { P2POffer } from "@/backend/models/P2POffer";
import type { P2PFinancialStateSnapshot } from "@/backend/models/FinancialAuditRecord";
import type { MarketOperation } from "@/backend/models/MarketOperation";
import { TokenHolding } from "@/backend/models/TokenHolding";
import { MarketRepository } from "@/backend/repositories/market.repository";
import type { MarketExecutor } from "@/backend/repositories/market.repository";
import { P2POfferRepository } from "@/backend/repositories/p2p-offer.repository";
import { UserRole } from "@/backend/models/enums";

interface P2PTradeState {
  participants: Awaited<ReturnType<MarketRepository["findTradeParticipants"]>>;
  holdings: Awaited<ReturnType<MarketRepository["findTradeHoldings"]>>;
  buyerHolding: TokenHolding;
}

export interface P2PTradeReceipt {
  operation: {
    id: string;
    buyerId: string;
    sellerId: string;
    offerId: string;
    playerId: string;
    quantity: number;
    unitPrice: number;
    total: number;
    createdAt: Date;
  };
  account: { creditBalance: number };
  holding: { quantity: number; averagePurchasePrice: number };
}

export class P2PTradeService {
  constructor(
    private readonly marketRepository = new MarketRepository(),
    private readonly offerRepository = new P2POfferRepository(),
    private readonly p2pTrade = new P2PTrade(),
  ) {}

  completeOffer(
    auth: AuthTokenPayload,
    offerId: string,
    idempotencyKey: string,
    correlationId?: string,
  ): Promise<P2PTradeReceipt> {
    return this.marketRepository.withTransaction((transaction) =>
      this.completeOfferInTransaction(
        transaction,
        auth.sub,
        offerId,
        idempotencyKey,
        correlationId,
      ),
    );
  }

  private async completeOfferInTransaction(
    transaction: MarketExecutor,
    buyerId: string,
    offerId: string,
    idempotencyKey: string,
    correlationId?: string,
  ): Promise<P2PTradeReceipt> {
    const offer = await this.findOfferForCompletion(transaction, offerId);
    const replay = await this.findCompatibleReplay(transaction, buyerId, offerId, idempotencyKey);
    if (replay) return replay;

    this.ensureOfferIsOpen(offer);
    const tradeState = await this.findTradeState(transaction, buyerId, offer);
    this.ensureTradeParticipantsCanOperate(tradeState);
    const result = this.completeTrade(
      offer,
      tradeState,
      correlationId,
      idempotencyKey,
    );

    await this.persistCompletedTrade(transaction, offer, tradeState, result);
    return this.toReceipt(result.operation, result.audit.newState);
  }

  private async findCompatibleReplay(
    transaction: MarketExecutor,
    buyerId: string,
    offerId: string,
    idempotencyKey: string,
  ): Promise<P2PTradeReceipt | undefined> {
    const replay = await this.marketRepository.findP2PReplay(transaction, buyerId, idempotencyKey);
    if (!replay) return undefined;
    if (!replay.operation.matchesOffer(offerId)) {
      throw new ConflictError("Idempotency key already used for another offer");
    }
    return this.toReceipt(replay.operation, replay.audit.newState);
  }

  private async findOfferForCompletion(
    transaction: MarketExecutor,
    offerId: string,
  ) {
    const offer = await this.offerRepository.findOfferForCompletion(offerId, transaction);
    if (!offer) throw new NotFoundError("Offer not found");
    return offer;
  }

  private ensureOfferIsOpen(offer: P2POffer): void {
    if (offer.status !== "OPEN") throw new ConflictError("Offer is no longer open");
  }

  private async findTradeState(
    transaction: MarketExecutor,
    buyerId: string,
    offer: P2POffer,
  ): Promise<P2PTradeState> {
    const participants = await this.marketRepository.findTradeParticipants(
      transaction,
      buyerId,
      offer.sellerId,
    );
    const holdings = await this.marketRepository.findTradeHoldings(
      transaction,
      offer.playerId,
      buyerId,
      offer.sellerId,
    );
    const buyerHolding =
      holdings.buyer ??
      new TokenHolding({ userId: buyerId, playerId: offer.playerId, quantity: 0, averagePurchasePrice: 0 });

    return { participants, holdings, buyerHolding };
  }

  private completeTrade(
    offer: P2POffer,
    tradeState: P2PTradeState,
    correlationId?: string,
    idempotencyKey?: string,
  ) {
    if (!tradeState.holdings.seller) throw new ConflictError("Insufficient token holding");

    try {
      return this.p2pTrade.complete(
        offer,
        tradeState.participants.buyer,
        tradeState.participants.seller,
        tradeState.buyerHolding,
        tradeState.holdings.seller,
        correlationId,
        idempotencyKey,
      );
    } catch (error) {
      if (error instanceof InsufficientTokenHoldingError) {
        throw new ConflictError(error.message);
      }
      throw error;
    }
  }

  private ensureTradeParticipantsCanOperate(tradeState: P2PTradeState): void {
    if (
      tradeState.participants.buyer.role !== UserRole.INVESTOR ||
      tradeState.participants.seller.role !== UserRole.INVESTOR
    ) {
      throw new ForbiddenError("Only investors can complete P2P trades");
    }
  }

  private async persistCompletedTrade(
    transaction: MarketExecutor,
    offer: P2POffer,
    tradeState: P2PTradeState,
    result: P2PTradeResult,
  ): Promise<void> {
    await this.marketRepository.persistTradeParticipants(transaction, [
      tradeState.participants.buyer,
      tradeState.participants.seller,
    ]);
    await this.marketRepository.persistTradeHoldings(transaction, [
      { holding: result.buyerHolding, exists: Boolean(tradeState.holdings.buyer) },
      { holding: result.sellerHolding, exists: true },
    ]);
    await this.offerRepository.completeOffer(offer.complete(), transaction);
    await this.marketRepository.recordCompletedTrade(transaction, result.operation);
    await this.marketRepository.recordFinancialTransition(transaction, result.audit);
  }

  private toReceipt(
    operation: MarketOperation,
    state: P2PFinancialStateSnapshot,
  ): P2PTradeReceipt {
    if (!operation.buyerId || !operation.sellerId || !operation.offerId) {
      throw new ConflictError("P2P trade data is incomplete");
    }
    if (!state.buyer) throw new ConflictError("P2P trade receipt is incomplete");
    return {
      operation: {
        id: operation.id,
        buyerId: operation.buyerId,
        sellerId: operation.sellerId,
        offerId: operation.offerId,
        playerId: operation.playerId,
        quantity: operation.quantity,
        unitPrice: operation.quoteValue,
        total: operation.total,
        createdAt: operation.createdAt,
      },
      account: { creditBalance: state.buyer.creditBalance },
      holding: {
        quantity: state.buyer.quantity,
        averagePurchasePrice: state.buyer.averagePurchasePrice,
      },
    };
  }
}
