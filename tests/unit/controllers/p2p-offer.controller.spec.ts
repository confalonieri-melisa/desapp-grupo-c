import { describe, expect, it, vi } from "vitest";
import { P2POfferController } from "@/backend/controllers/p2p-offer.controller";

describe("P2POfferController", () => {
  it("delegates offer publication, listing, acceptance and cancellation", async () => {
    const offer = {
      id: "offer-id",
      sellerId: "seller-id",
      playerId: "player-id",
      quantity: 2,
      unitPrice: 10,
      status: "OPEN" as const,
      createdAt: new Date(),
    };
    const offerService = {
      publishOffer: vi.fn().mockResolvedValue(offer),
      findAvailableOffers: vi.fn().mockResolvedValue([offer]),
      cancelOffer: vi.fn().mockResolvedValue(undefined),
    };
    const tradeService = {
      completeOffer: vi.fn().mockResolvedValue({ operation: { id: "operation-id" } }),
    };
    const controller = new P2POfferController(offerService as never, tradeService as never);
    const auth = { sub: "buyer-id", email: "buyer@test.local", role: "INVESTOR" };

    await expect(controller.publishOffer(auth, { playerId: "player-id", quantity: 2, unitPrice: 10 })).resolves.toMatchObject({ id: "offer-id" });
    await expect(controller.findAvailableOffers({})).resolves.toHaveLength(1);
    await expect(controller.completeOffer(auth, "offer-id", "trade-key", "correlation-id")).resolves.toEqual({ operation: { id: "operation-id" } });
    await expect(controller.cancelOffer(auth, "offer-id")).resolves.toBeUndefined();

    expect(offerService.publishOffer).toHaveBeenCalled();
    expect(offerService.findAvailableOffers).toHaveBeenCalledWith({});
    expect(tradeService.completeOffer).toHaveBeenCalledWith(auth, "offer-id", "trade-key", "correlation-id");
    expect(offerService.cancelOffer).toHaveBeenCalledWith(auth, "offer-id");
  });
});
