import { describe, expect, it } from "vitest";
import { P2PTrade } from "@/backend/models/P2PTrade";
import { P2POffer } from "@/backend/models/P2POffer";
import { TokenHolding } from "@/backend/models/TokenHolding";
import { User } from "@/backend/models/User";
import { ConflictError } from "@/backend/errors/http.error";
import { InsufficientTokenHoldingError } from "@/backend/models/errors";

const user = (id: string, creditBalance = 100) =>
  new User({ id, name: id, email: `${id}@test.local`, password: "password", creditBalance });

describe("P2PTrade", () => {
  it("transfers credits and tokens at the offer price", () => {
    const result = new P2PTrade().complete(
      new P2POffer({ sellerId: "seller-id", playerId: "player-id", quantity: 3, unitPrice: 12.5 }),
      user("buyer-id", 100),
      user("seller-id", 50),
      new TokenHolding({ userId: "buyer-id", playerId: "player-id", quantity: 0, averagePurchasePrice: 0 }),
      new TokenHolding({ userId: "seller-id", playerId: "player-id", quantity: 5, averagePurchasePrice: 10 }),
    );

    expect(result.operation.total).toBe(37.5);
    expect(result.operation.buyerId).toBe("buyer-id");
    expect(result.operation.sellerId).toBe("seller-id");
    expect(result.operation.offerId).toBeDefined();
    expect(result.buyerHolding.quantity).toBe(3);
    expect(result.sellerHolding.quantity).toBe(2);
    expect(result.audit.action).toBe("P2P_TRADE");
    expect(result.audit.previousState.buyer.creditBalance).toBe(100);
    expect(result.audit.previousState.seller.quantity).toBe(5);
    expect(result.audit.newState.buyer.creditBalance).toBe(62.5);
    expect(result.audit.newState.seller.quantity).toBe(2);
  });

  it("rejects insufficient balance and self-trades", () => {
    const offer = new P2POffer({ sellerId: "seller-id", playerId: "player-id", quantity: 3, unitPrice: 12.5 });
    const holding = new TokenHolding({ userId: "seller-id", playerId: "player-id", quantity: 5, averagePurchasePrice: 10 });
    expect(() => new P2PTrade().complete(offer, user("buyer-id", 1), user("seller-id"), new TokenHolding({ userId: "buyer-id", playerId: "player-id", quantity: 0, averagePurchasePrice: 0 }), holding)).toThrow(ConflictError);
    expect(() => new P2PTrade().complete(offer, user("buyer-id"), user("seller-id"), new TokenHolding({ userId: "buyer-id", playerId: "player-id", quantity: 0, averagePurchasePrice: 0 }), new TokenHolding({ userId: "seller-id", playerId: "player-id", quantity: 1, averagePurchasePrice: 10 }))).toThrow(InsufficientTokenHoldingError);
    expect(() => new P2PTrade().complete(offer, user("seller-id"), user("seller-id"), holding, holding)).toThrow(ConflictError);
  });
});
