import { describe, expect, it } from "vitest";
import { P2POffer } from "@/backend/models/P2POffer";
import { DomainValidationError } from "@/backend/models/errors";
import { OfferNotOpenError } from "@/backend/models/errors";

const offer = () =>
  new P2POffer({ sellerId: "seller-id", playerId: "player-id", quantity: 3, unitPrice: 12.5 });

describe("P2POffer", () => {
  it("creates an open fixed-price offer", () => {
    expect(offer().status).toBe("OPEN");
    expect(offer().unitPrice).toBe(12.5);
  });

  it("completes and cancels only open offers", () => {
    expect(offer().complete().status).toBe("FILLED");
    expect(offer().cancel().status).toBe("CANCELLED");
    expect(() => offer().complete().cancel()).toThrow(OfferNotOpenError);
  });

  it.each([
    { quantity: 0, unitPrice: 10 },
    { quantity: 1.5, unitPrice: 10 },
    { quantity: 1, unitPrice: 0 },
    { quantity: 1, unitPrice: 10.123 },
  ])("rejects invalid offer values", (props) => {
    expect(() => new P2POffer({ sellerId: "seller-id", playerId: "player-id", ...props })).toThrow(
      DomainValidationError,
    );
  });
});
