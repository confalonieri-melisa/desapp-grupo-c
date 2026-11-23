import { describe, expect, it, vi } from "vitest";
import { ConflictError } from "@/backend/errors/http.error";
import { P2POffer } from "@/backend/models/P2POffer";
import { P2PTrade } from "@/backend/models/P2PTrade";
import { TokenHolding } from "@/backend/models/TokenHolding";
import { User } from "@/backend/models/User";
import { P2PTradeService } from "@/backend/services/p2p-trade.service";

const auth = { sub: "buyer-id", email: "buyer@test.local", role: "INVESTOR" };
const transaction = {} as never;

function users() {
  return {
    buyer: new User({ id: "buyer-id", name: "Buyer", email: "buyer@test.local", password: "secret" }),
    seller: new User({ id: "seller-id", name: "Seller", email: "seller@test.local", password: "secret" }),
  };
}

function offer(id = "offer-id") {
  return new P2POffer({ id, sellerId: "seller-id", playerId: "player-id", quantity: 2, unitPrice: 10 });
}

function dependencies() {
  const participants = users();
  const holdings = {
    buyer: new TokenHolding({ userId: "buyer-id", playerId: "player-id", quantity: 0, averagePurchasePrice: 0 }),
    seller: new TokenHolding({ userId: "seller-id", playerId: "player-id", quantity: 5, averagePurchasePrice: 8 }),
  };
  const marketRepository = {
    withTransaction: vi.fn(async (work: (value: never) => Promise<unknown>) => work(transaction)),
    findP2PReplay: vi.fn().mockResolvedValue(undefined),
    findTradeParticipants: vi.fn().mockResolvedValue(participants),
    findTradeHoldings: vi.fn().mockResolvedValue(holdings),
    persistTradeParticipants: vi.fn(),
    persistTradeHoldings: vi.fn(),
    recordCompletedTrade: vi.fn(),
    recordFinancialTransition: vi.fn(),
  };
  const offerRepository = {
    findOfferForCompletion: vi.fn().mockResolvedValue(offer()),
    completeOffer: vi.fn(),
  };
  const p2pTrade = new P2PTrade();
  return { marketRepository, offerRepository, p2pTrade, participants, holdings };
}

describe("P2PTradeService", () => {
  it("coordinates a trade and returns only the buyer receipt", async () => {
    const dependenciesSet = dependencies();
    const service = new P2PTradeService(
      dependenciesSet.marketRepository as never,
      dependenciesSet.offerRepository as never,
      dependenciesSet.p2pTrade,
    );

    const receipt = await service.completeOffer(auth, "offer-id", "trade-key", "correlation-id");

    expect(receipt).toMatchObject({
      operation: { offerId: "offer-id", buyerId: "buyer-id", sellerId: "seller-id", total: 20 },
      account: { creditBalance: 980 },
      holding: { quantity: 2, averagePurchasePrice: 10 },
    });
    expect(receipt).not.toHaveProperty("seller");
    expect(dependenciesSet.offerRepository.completeOffer).toHaveBeenCalledWith(
      expect.objectContaining({ status: "FILLED" }),
      transaction,
    );
    expect(dependenciesSet.marketRepository.recordCompletedTrade).toHaveBeenCalledOnce();
    expect(dependenciesSet.marketRepository.recordFinancialTransition).toHaveBeenCalledOnce();
  });

  it("returns a compatible replay without executing or persisting a second trade", async () => {
    const dependenciesSet = dependencies();
    const completed = new P2PTrade().complete(
      offer(),
      dependenciesSet.participants.buyer,
      dependenciesSet.participants.seller,
      dependenciesSet.holdings.buyer,
      dependenciesSet.holdings.seller,
    );
    dependenciesSet.marketRepository.findP2PReplay.mockResolvedValue({
      operation: completed.operation,
      audit: completed.audit,
    });
    const complete = vi.spyOn(dependenciesSet.p2pTrade, "complete");
    const service = new P2PTradeService(
      dependenciesSet.marketRepository as never,
      dependenciesSet.offerRepository as never,
      dependenciesSet.p2pTrade,
    );

    const receipt = await service.completeOffer(auth, "offer-id", "trade-key");

    expect(receipt.operation.id).toBe(completed.operation.id);
    expect(complete).not.toHaveBeenCalled();
    expect(
      dependenciesSet.offerRepository.findOfferForCompletion.mock.invocationCallOrder[0],
    ).toBeLessThan(dependenciesSet.marketRepository.findP2PReplay.mock.invocationCallOrder[0]);
    expect(dependenciesSet.offerRepository.findOfferForCompletion).toHaveBeenCalledOnce();
    expect(dependenciesSet.marketRepository.persistTradeParticipants).not.toHaveBeenCalled();
    expect(dependenciesSet.marketRepository.recordCompletedTrade).not.toHaveBeenCalled();
  });

  it("rejects a replay key associated with another offer", async () => {
    const dependenciesSet = dependencies();
    const completed = new P2PTrade().complete(
      offer("other-offer-id"),
      dependenciesSet.participants.buyer,
      dependenciesSet.participants.seller,
      dependenciesSet.holdings.buyer,
      dependenciesSet.holdings.seller,
    );
    dependenciesSet.marketRepository.findP2PReplay.mockResolvedValue({
      operation: completed.operation,
      audit: completed.audit,
    });
    const service = new P2PTradeService(
      dependenciesSet.marketRepository as never,
      dependenciesSet.offerRepository as never,
      dependenciesSet.p2pTrade,
    );

    await expect(service.completeOffer(auth, "offer-id", "trade-key")).rejects.toBeInstanceOf(ConflictError);
  });
});
