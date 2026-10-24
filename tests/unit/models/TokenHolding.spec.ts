import { describe, expect, it } from "vitest";
import {
  INITIAL_TOKEN_PRICE,
  INITIAL_TOKEN_QUANTITY,
  TokenHolding,
} from "@/backend/models/TokenHolding";
import { DomainValidationError } from "@/backend/models/errors";

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

  it("updates the weighted average when buying", () => {
    const holding = new TokenHolding({
      userId: "investor-id",
      playerId: "player-id",
      quantity: 2,
      averagePurchasePrice: 10,
    });

    const updated = holding.buy(3, 20);

    expect(updated.quantity).toBe(5);
    expect(updated.averagePurchasePrice).toBe(16);
  });

  it("keeps the average on a partial sale and resets it on liquidation", () => {
    const holding = new TokenHolding({
      userId: "investor-id",
      playerId: "player-id",
      quantity: 5,
      averagePurchasePrice: 16,
    });

    expect(holding.sell(2).averagePurchasePrice).toBe(16);
    expect(holding.sell(5).averagePurchasePrice).toBe(0);
  });

  it("calculates current value and unrealized pnl at a quote", () => {
    const holding = new TokenHolding({
      userId: "investor-id",
      playerId: "player-id",
      quantity: 5,
      averagePurchasePrice: 10,
    });

    expect(holding.currentValueAt(12.5)).toBe(62.5);
    expect(holding.unrealizedPnlAt(12.5)).toBe(12.5);
  });

  it("rejects buying or selling a non-positive quantity", () => {
    const holding = new TokenHolding({ userId: "investor-id", playerId: "player-id" });
    expect(() => holding.buy(0, 1)).toThrow(DomainValidationError);
    expect(() => holding.sell(0)).toThrow(DomainValidationError);
  });

  it("rejects selling more tokens than held", () => {
    const holding = new TokenHolding({ userId: "investor-id", playerId: "player-id", quantity: 1 });
    expect(() => holding.sell(2)).toThrow(DomainValidationError);
  });
});
