import { describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError } from "@/backend/errors/http.error";
import { P2POffer } from "@/backend/models/P2POffer";
import { User } from "@/backend/models/User";
import { UserRole } from "@/backend/models/enums";
import { P2POfferService } from "@/backend/services/p2p-offer.service";

const auth = { sub: "seller-id", email: "seller@test.local", role: "INVESTOR" };
const input = { playerId: "player-id", quantity: 2, unitPrice: 10 };
const transaction = {} as never;

function dependencies() {
  const offer = new P2POffer({ sellerId: "seller-id", ...input });
  const seller = new User({
    id: "seller-id",
    name: "Seller",
    email: "seller@test.local",
    password: "secret",
  });
  return {
    offerRepository: {
      publishOffer: vi.fn().mockResolvedValue(offer),
      findAvailableOffers: vi.fn(),
      findOwnedOffer: vi.fn(),
      cancelOffer: vi.fn(),
    },
    playerRepository: { findById: vi.fn().mockResolvedValue({ id: "player-id" }) },
    userRepository: { findById: vi.fn().mockResolvedValue(seller) },
    marketRepository: {
      withTransaction: vi.fn(async (work: (value: never) => Promise<unknown>) =>
        work(transaction),
      ),
      reserveTokensForOffer: vi.fn(),
      releaseReservedTokens: vi.fn(),
    },
    seller,
    offer,
  };
}

describe("P2POfferService", () => {
  it("validates the seller and reserves the holding before publishing", async () => {
    const set = dependencies();
    const service = new P2POfferService(
      set.offerRepository as never,
      set.playerRepository as never,
      set.userRepository as never,
      set.marketRepository as never,
    );

    await expect(service.publishOffer(auth, input)).resolves.toBe(set.offer);
    expect(set.offerRepository.publishOffer).toHaveBeenCalledWith(
      expect.objectContaining({ sellerId: "seller-id", playerId: "player-id", quantity: 2 }),
      transaction,
    );
    expect(set.marketRepository.reserveTokensForOffer).toHaveBeenCalledWith(
      transaction,
      "seller-id",
      "player-id",
      2,
    );
  });

  it("rejects publication by the superuser", async () => {
    const set = dependencies();
    set.userRepository.findById.mockResolvedValue(
      new User({
        id: "seller-id",
        name: "Pool",
        email: "pool@test.local",
        password: "secret",
        role: UserRole.SUPERUSER,
      }),
    );
    const service = new P2POfferService(
      set.offerRepository as never,
      set.playerRepository as never,
      set.userRepository as never,
      set.marketRepository as never,
    );

    await expect(service.publishOffer(auth, input)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects a missing seller", async () => {
    const set = dependencies();
    set.userRepository.findById.mockResolvedValueOnce(null);
    const service = new P2POfferService(
      set.offerRepository as never,
      set.playerRepository as never,
      set.userRepository as never,
      set.marketRepository as never,
    );
    await expect(service.publishOffer(auth, input)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lists available offers and cancels an owned open offer", async () => {
    const set = dependencies();
    set.offerRepository.findAvailableOffers = vi
      .fn()
      .mockResolvedValue([{ offer: set.offer, sellerName: "Seller" }]);
    set.offerRepository.findOwnedOffer = vi.fn().mockResolvedValue(set.offer);
    set.offerRepository.cancelOffer = vi.fn().mockResolvedValue(undefined);
    set.marketRepository.withTransaction.mockImplementation(
      async (work: (value: never) => Promise<unknown>) => work(transaction),
    );
    const service = new P2POfferService(
      set.offerRepository as never,
      set.playerRepository as never,
      set.userRepository as never,
      set.marketRepository as never,
    );

    await expect(service.findAvailableOffers({ playerId: input.playerId })).resolves.toEqual([
      { offer: set.offer, sellerName: "Seller" },
    ]);
    await expect(service.cancelOffer(auth, set.offer.id)).resolves.toBeUndefined();
    expect(set.offerRepository.cancelOffer).toHaveBeenCalledWith(
      expect.objectContaining({ status: "CANCELLED" }),
      transaction,
    );
    expect(set.marketRepository.releaseReservedTokens).toHaveBeenCalledWith(
      transaction,
      "seller-id",
      "player-id",
      input.quantity,
    );
  });
});
