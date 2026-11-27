import type { AuthTokenPayload } from "@/backend/utils/jwt";
import { ConflictError, ForbiddenError, NotFoundError } from "@/backend/errors/http.error";
import { OfferNotOpenError } from "@/backend/models/errors";
import { P2POffer } from "@/backend/models/P2POffer";
import { PlayerRepository } from "@/backend/repositories/player.repository";
import { P2POfferRepository } from "@/backend/repositories/p2p-offer.repository";
import { MarketRepository, type MarketExecutor } from "@/backend/repositories/market.repository";
import { UserRepository } from "@/backend/repositories/user.repository";
import { UserRole } from "@/backend/models/enums";
import type { CreateP2POfferRequest, P2POfferQuery } from "@/backend/schemas/p2p-offer.schema";

export class P2POfferService {
  constructor(
    private readonly offerRepository = new P2POfferRepository(),
    private readonly playerRepository = new PlayerRepository(),
    private readonly userRepository = new UserRepository(),
    private readonly marketRepository = new MarketRepository(),
  ) {}

  async publishOffer(auth: AuthTokenPayload, input: CreateP2POfferRequest): Promise<P2POffer> {
    await this.ensureSellerCanPublishOffer(auth.sub, input.playerId);
    const offer = new P2POffer({ ...input, sellerId: auth.sub });

    return this.marketRepository.withTransaction(async (transaction) => {
      await this.marketRepository.reserveTokensForOffer(
        transaction,
        offer.sellerId,
        offer.playerId,
        offer.quantity,
      );
      return this.offerRepository.publishOffer(offer, transaction);
    });
  }

  private async ensureSellerCanPublishOffer(
    sellerId: string,
    playerId: string,
  ): Promise<void> {
    const [seller, player] = await Promise.all([
      this.userRepository.findById(sellerId),
      this.playerRepository.findById(playerId),
    ]);

    if (!seller) throw new NotFoundError("Seller not found");
    if (seller.role !== UserRole.INVESTOR) {
      throw new ForbiddenError("Only investors can publish P2P offers");
    }
    if (!player) throw new NotFoundError("Player not found");

  }

  findAvailableOffers(query: P2POfferQuery): Promise<{ offer: P2POffer; sellerName: string }[]> {
    return this.offerRepository.findAvailableOffers(query.playerId);
  }

  async cancelOffer(auth: AuthTokenPayload, offerId: string): Promise<void> {
    await this.marketRepository.withTransaction(async (transaction) => {
      const offer = await this.ensureSellerCanCancelOffer(transaction, auth.sub, offerId);

      try {
        await this.offerRepository.cancelOffer(offer.cancel(), transaction);
        await this.marketRepository.releaseReservedTokens(
          transaction,
          offer.sellerId,
          offer.playerId,
          offer.quantity,
        );
      } catch (error) {
        if (error instanceof OfferNotOpenError) {
          throw new ConflictError(error.message);
        }
        throw error;
      }
    });
  }

  private async ensureSellerCanCancelOffer(
    transaction: MarketExecutor,
    sellerId: string,
    offerId: string,
  ): Promise<P2POffer> {
    const offer = await this.offerRepository.findOwnedOffer(offerId, sellerId, transaction);

    if (!offer) {
      throw new NotFoundError("Offer not found or not owned by the authenticated user");
    }

    return offer;
  }
}
