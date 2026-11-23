import type { AuthTokenPayload } from "@/backend/utils/jwt";
import type { CreateP2POfferRequest, P2POfferQuery } from "@/backend/schemas/p2p-offer.schema";
import { P2POfferService } from "@/backend/services/p2p-offer.service";
import { P2PTradeService } from "@/backend/services/p2p-trade.service";

export class P2POfferController {
  constructor(
    private readonly offerService = new P2POfferService(),
    private readonly tradeService = new P2PTradeService(),
  ) {}

  publishOffer(auth: AuthTokenPayload, input: CreateP2POfferRequest) {
    return this.offerService.publishOffer(auth, input).then(toOfferResponse);
  }

  findAvailableOffers(query: P2POfferQuery) {
    return this.offerService.findAvailableOffers(query).then((offers) => offers.map(toOfferResponse));
  }

  completeOffer(auth: AuthTokenPayload, offerId: string, idempotencyKey: string, correlationId?: string) {
    return this.tradeService.completeOffer(auth, offerId, idempotencyKey, correlationId);
  }

  cancelOffer(auth: AuthTokenPayload, offerId: string) {
    return this.offerService.cancelOffer(auth, offerId);
  }
}

function toOfferResponse(offer: Awaited<ReturnType<P2POfferService["publishOffer"]>>) {
  return {
    id: offer.id,
    sellerId: offer.sellerId,
    playerId: offer.playerId,
    quantity: offer.quantity,
    unitPrice: offer.unitPrice,
    status: offer.status,
    createdAt: offer.createdAt,
  };
}
