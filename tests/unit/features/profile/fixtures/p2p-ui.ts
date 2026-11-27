export const investor = { id: "11111111-1111-4111-8111-111111111111", role: "INVESTOR" };
export const seller = { id: "22222222-2222-4222-8222-222222222222", role: "INVESTOR" };
export const playerId = "33333333-3333-4333-8333-333333333333";
export const offer = {
  id: "44444444-4444-4444-8444-444444444444",
  sellerId: seller.id,
  playerId,
  quantity: 2,
  unitPrice: 12.35,
  status: "OPEN" as const,
  createdAt: "2026-11-25T12:00:00Z",
};
export const ownOffer = {
  ...offer,
  id: "55555555-5555-4555-8555-555555555555",
  sellerId: investor.id,
};
export const portfolio = {
  creditBalance: 100,
  items: [
    {
      playerId,
      quantity: 5,
      averagePurchasePrice: 8,
      currentQuoteValue: 10,
      currentValue: 50,
      unrealizedPnl: 10,
    },
  ],
};
export const receipt = {
  operation: {
    id: "66666666-6666-4666-8666-666666666666",
    buyerId: investor.id,
    sellerId: seller.id,
    offerId: offer.id,
    playerId,
    quantity: 2,
    unitPrice: 12.35,
    total: 24.7,
    createdAt: offer.createdAt,
  },
  account: { creditBalance: 75.3 },
  holding: { quantity: 7, averagePurchasePrice: 9.24 },
};
