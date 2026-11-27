import { P2POffer } from "@/backend/models/P2POffer";
import { TokenHolding } from "@/backend/models/TokenHolding";
import { User } from "@/backend/models/User";

export const p2pFixture = {
  buyerId: "00000000-0000-4000-8000-000000000701",
  sellerId: "00000000-0000-4000-8000-000000000702",
  playerId: "00000000-0000-4000-8000-000000000703",
};

export function createP2PFixture() {
  const buyer = new User({ id: p2pFixture.buyerId, name: "Buyer", email: "buyer@test.local", password: "secret" });
  const seller = new User({ id: p2pFixture.sellerId, name: "Seller", email: "seller@test.local", password: "secret" });
  const offer = new P2POffer({ sellerId: p2pFixture.sellerId, playerId: p2pFixture.playerId, quantity: 2, unitPrice: 10 });
  return {
    buyer,
    seller,
    offer,
    buyerHolding: new TokenHolding({ userId: buyer.id, playerId: p2pFixture.playerId, quantity: 0, averagePurchasePrice: 0 }),
    sellerHolding: new TokenHolding({ userId: seller.id, playerId: p2pFixture.playerId, quantity: 10, reservedQuantity: offer.quantity, averagePurchasePrice: 8 }),
  };
}
