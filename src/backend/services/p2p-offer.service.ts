import type { AuthTokenPayload } from "@/backend/utils/jwt";
import { ConflictError, ForbiddenError, NotFoundError } from "@/backend/errors/http.error";
import { OfferNotOpenError } from "@/backend/models/errors";
import { P2POffer } from "@/backend/models/P2POffer";
import { PlayerRepository } from "@/backend/repositories/player.repository";
import { PortfolioRepository } from "@/backend/repositories/portfolio.repository";
import { P2POfferRepository } from "@/backend/repositories/p2p-offer.repository";
import { MarketRepository, type MarketExecutor } from "@/backend/repositories/market.repository";
import { UserRepository } from "@/backend/repositories/user.repository";
import { UserRole } from "@/backend/models/enums";
import type { CreateP2POfferRequest, P2POfferQuery } from "@/backend/schemas/p2p-offer.schema";

export class P2POfferService {
  constructor(
    private readonly offerRepository = new P2POfferRepository(),
    private readonly playerRepository = new PlayerRepository(),
    private readonly portfolioRepository = new PortfolioRepository(),
    private readonly userRepository = new UserRepository(),
    private readonly marketRepository = new MarketRepository(),
  ) {}

  async publishOffer(auth: AuthTokenPayload, input: CreateP2POfferRequest): Promise<P2POffer> {
    await this.ensureSellerCanPublishOffer(auth.sub, input.playerId, input.quantity);

    return this.offerRepository.publishOffer(
      new P2POffer({ ...input, sellerId: auth.sub }),
    );
  }

  private async ensureSellerCanPublishOffer(sellerId: string, playerId: string, quantity: number): Promise<void> {
    const [seller, player] = await Promise.all([
      this.userRepository.findById(sellerId),
      this.playerRepository.findById(playerId),
    ]);

    if (!seller) throw new NotFoundError("Seller not found");
    if (seller.role !== UserRole.INVESTOR) {
      throw new ForbiddenError("Only investors can publish P2P offers");
    }
    if (!player) throw new NotFoundError("Player not found");

    await this.ensureSellerHasTokensToOffer(sellerId, playerId, quantity);
  }

  private async ensureSellerHasTokensToOffer(sellerId: string, playerId: string, quantity: number): Promise<void> {
    const positions = await this.portfolioRepository.findPositionsByUserId(sellerId);
    const holding = positions.find((position) => position.playerId === playerId);

    if (!holding || !holding.canSell(quantity)) {
      throw new ConflictError("Insufficient token holding");
    }
  }

  findAvailableOffers(query: P2POfferQuery): Promise<P2POffer[]> {
    return this.offerRepository.findAvailableOffers(query.playerId);
  }

  async cancelOffer(auth: AuthTokenPayload, offerId: string): Promise<void> {
    await this.marketRepository.withTransaction(async (transaction) => {
      const offer = await this.ensureSellerCanCancelOffer(transaction, auth.sub, offerId);

      try {
        await this.offerRepository.cancelOffer(offer.cancel(), transaction);
      } catch (error) {
        if (error instanceof OfferNotOpenError) {
          throw new ConflictError(error.message);
        }
        throw error;
      }
    });
  }

  private async ensureSellerCanCancelOffer(transaction: MarketExecutor, sellerId: string, offerId: string): Promise<P2POffer> {
    const offer = await this.offerRepository.findOwnedOffer(offerId, sellerId, transaction);

    if (!offer) {
      throw new NotFoundError("Offer not found or not owned by the authenticated user");
    }

    return offer;
  }
}
