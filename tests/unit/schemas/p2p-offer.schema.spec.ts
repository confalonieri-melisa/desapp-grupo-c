import { describe, expect, it } from "vitest";
import { createP2POfferSchema, p2pOfferQuerySchema } from "@/backend/schemas/p2p-offer.schema";

const playerId = "550e8400-e29b-41d4-a716-446655440000";

describe("P2P offer schemas", () => {
  it("accepts only the fixed-price offer contract", () => {
    expect(createP2POfferSchema.parse({ playerId, quantity: 2, unitPrice: 10.25 })).toEqual({ playerId, quantity: 2, unitPrice: 10.25 });
    expect(() => createP2POfferSchema.parse({ playerId, quantity: 2, unitPrice: 10, quoteId: "unexpected" })).toThrow();
    expect(createP2POfferSchema.parse({ playerId, quantity: 1, unitPrice: 0.29 }).unitPrice).toBe(0.29);
    expect(() => createP2POfferSchema.parse({ playerId, quantity: 1, unitPrice: 1.005 })).toThrow();
  });

  it("supports an optional player filter", () => {
    expect(p2pOfferQuerySchema.parse({ playerId })).toEqual({ playerId });
    expect(p2pOfferQuerySchema.parse({})).toEqual({});
  });
});
