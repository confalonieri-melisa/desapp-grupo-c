import { describe, expect, it } from "vitest";
import {
  INITIAL_TOKEN_PRICE,
  INITIAL_TOKEN_QUANTITY,
  TokenHolding,
} from "@/models/TokenHolding";
import { DomainValidationError } from "@/models/errors";

describe("TokenHolding", () => {
  it("creates the initial superuser holding at t0", () => {
    const holding = TokenHolding.initialSeed("superuser-id", "player-id");

    expect(holding.quantity).toBe(INITIAL_TOKEN_QUANTITY);
    expect(holding.averagePurchasePrice).toBe(INITIAL_TOKEN_PRICE);
    expect(holding.userId).toBe("superuser-id");
    expect(holding.playerId).toBe("player-id");
  });

  it("defaults a regular holding to zero tokens and the base price", () => {
    const holding = new TokenHolding({
      userId: "investor-id",
      playerId: "player-id",
    });

    expect(holding.quantity).toBe(0);
    expect(holding.averagePurchasePrice).toBe(1);
  });

  it("accepts non-negative integer quantities and prices", () => {
    const holding = new TokenHolding({
      userId: "investor-id",
      playerId: "player-id",
      quantity: 15,
      averagePurchasePrice: 1.25,
    });

    expect(holding.quantity).toBe(15);
    expect(holding.averagePurchasePrice).toBe(1.25);
  });

  it.each([
    { quantity: -1, averagePurchasePrice: 1 },
    { quantity: 1.5, averagePurchasePrice: 1 },
    { quantity: 1, averagePurchasePrice: -0.5 },
    { quantity: 1, averagePurchasePrice: Number.NaN },
  ])(
    "rejects invalid holding values: $quantity / $averagePurchasePrice",
    (props) => {
      expect(
        () =>
          new TokenHolding({
            userId: "investor-id",
            playerId: "player-id",
            ...props,
          }),
      ).toThrow(DomainValidationError);
    },
  );
});
