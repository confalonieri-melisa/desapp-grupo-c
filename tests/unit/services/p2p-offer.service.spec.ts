import { describe, expect, it, vi } from "vitest";
import { ConflictError, ForbiddenError, NotFoundError } from "@/backend/errors/http.error";
import { P2POffer } from "@/backend/models/P2POffer";
import { TokenHolding } from "@/backend/models/TokenHolding";
import { User } from "@/backend/models/User";
import { UserRole } from "@/backend/models/enums";
import { P2POfferService } from "@/backend/services/p2p-offer.service";

const auth = { sub: "seller-id", email: "seller@test.local", role: "INVESTOR" };
const input = { playerId: "player-id", quantity: 2, unitPrice: 10 };
const transaction = {} as never;

function dependencies() {
  const offer = new P2POffer({ sellerId: "seller-id", ...input });
  const seller = new User({ id: "seller-id", name: "Seller", email: "seller@test.local", password: "secret" });
  return {
    offerRepository: {
      publishOffer: vi.fn().mockResolvedValue(offer),
      findAvailableOffers: vi.fn(),
      findOwnedOffer: vi.fn(),
      cancelOffer: vi.fn(),
    },
    playerRepository: { findById: vi.fn().mockResolvedValue({ id: "player-id" }) },
    portfolioRepository: {
      findPositionsByUserId: vi.fn().mockResolvedValue([
        new TokenHolding({ userId: "seller-id", playerId: "player-id", quantity: 3, averagePurchasePrice: 8 }),
      ]),
    },
    userRepository: { findById: vi.fn().mockResolvedValue(seller) },
    marketRepository: { withTransaction: vi.fn() },
    seller,
    offer,
  };
}

describe("P2POfferService", () => {
  it("validates the seller, player and holding before publishing", async () => {
    const set = dependencies();
    const service = new P2POfferService(
      set.offerRepository as never,
      set.playerRepository as never,
      set.portfolioRepository as never,
      set.userRepository as never,
      set.marketRepository as never,
    );

    await expect(service.publishOffer(auth, input)).resolves.toBe(set.offer);
    expect(set.offerRepository.publishOffer).toHaveBeenCalledWith(
      expect.objectContaining({ sellerId: "seller-id", playerId: "player-id", quantity: 2 }),
    );
  });

  it("rejects publication by the superuser", async () => {
    const set = dependencies();
    set.userRepository.findById.mockResolvedValue(
      new User({ id: "seller-id", name: "Pool", email: "pool@test.local", password: "secret", role: UserRole.SUPERUSER }),
    );
    const service = new P2POfferService(
      set.offerRepository as never,
      set.playerRepository as never,
      set.portfolioRepository as never,
      set.userRepository as never,
      set.marketRepository as never,
    );

    await expect(service.publishOffer(auth, input)).rejects.toBeInstanceOf(ForbiddenError);
    expect(set.portfolioRepository.findPositionsByUserId).not.toHaveBeenCalled();
  });

  it("rejects a missing seller or insufficient holding", async () => {
    const set = dependencies();
    set.userRepository.findById.mockResolvedValueOnce(null);
    const service = new P2POfferService(
      set.offerRepository as never,
      set.playerRepository as never,
      set.portfolioRepository as never,
      set.userRepository as never,
      set.marketRepository as never,
    );
    await expect(service.publishOffer(auth, input)).rejects.toBeInstanceOf(NotFoundError);

    const insufficient = dependencies();
    insufficient.portfolioRepository.findPositionsByUserId.mockResolvedValueOnce([]);
    const insufficientService = new P2POfferService(
      insufficient.offerRepository as never,
      insufficient.playerRepository as never,
      insufficient.portfolioRepository as never,
      insufficient.userRepository as never,
      insufficient.marketRepository as never,
    );
    await expect(insufficientService.publishOffer(auth, input)).rejects.toBeInstanceOf(ConflictError);
  });

  it("lists available offers and cancels an owned open offer", async () => {
    const set = dependencies();
    set.offerRepository.findAvailableOffers = vi.fn().mockResolvedValue([set.offer]);
    set.offerRepository.findOwnedOffer = vi.fn().mockResolvedValue(set.offer);
    set.offerRepository.cancelOffer = vi.fn().mockResolvedValue(undefined);
    set.marketRepository.withTransaction.mockImplementation(async (work: (value: never) => Promise<unknown>) => work(transaction));
    const service = new P2POfferService(
      set.offerRepository as never,
      set.playerRepository as never,
      set.portfolioRepository as never,
      set.userRepository as never,
      set.marketRepository as never,
    );

    await expect(service.findAvailableOffers({ playerId: input.playerId })).resolves.toEqual([set.offer]);
    await expect(service.cancelOffer(auth, set.offer.id)).resolves.toBeUndefined();
    expect(set.offerRepository.cancelOffer).toHaveBeenCalledWith(
      expect.objectContaining({ status: "CANCELLED" }),
      transaction,
    );
  });
});
