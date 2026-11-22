import { describe, expect, it } from "vitest";
import { BusinessConflictError } from "@/backend/errors/application.error";
import { MarketTrade } from "@/backend/models/MarketTrade";
import { TokenHolding } from "@/backend/models/TokenHolding";
import { User } from "@/backend/models/User";
import { UserRole } from "@/backend/models/enums";

const marketTrade = new MarketTrade();

function createState() {
  return {
    investor: new User({
      id: "investor-id",
      name: "Investor",
      email: "investor@example.com",
      password: "secret",
      creditBalance: 100,
    }),
    pool: new User({
      id: "pool-id",
      name: "Pool",
      email: "pool@example.com",
      password: "secret",
      role: UserRole.SUPERUSER,
      creditBalance: 500,
    }),
    investorHolding: new TokenHolding({ userId: "investor-id", playerId: "player-id" }),
    poolHolding: new TokenHolding({
      userId: "pool-id",
      playerId: "player-id",
      quantity: 100,
      averagePurchasePrice: 1,
    }),
    investorHoldingExists: false,
    quote: { id: "quote-id", quoteValue: 10, unit: "CREDIT_PER_TOKEN" },
  };
}

function purchaseRequest(quantity = 3) {
  return { investorId: "investor-id", playerId: "player-id", quantity };
}

describe("MarketTrade", () => {
  it("settles a purchase against the central pool", () => {
    const state = createState();
    const outcome = marketTrade.buyFromPool(purchaseRequest(), state);

    expect(state.investor.creditBalance).toBe(70);
    expect(state.pool.creditBalance).toBe(530);
    expect(outcome.investorHolding.quantity).toBe(3);
    expect(outcome.poolHolding.quantity).toBe(97);
    expect(outcome.audit.previousState.investor).toMatchObject({
      creditBalance: 100,
      quantity: 0,
    });
    expect(outcome.audit.newState.pool).toMatchObject({
      creditBalance: 530,
      quantity: 97,
    });
  });

  it("rejects a purchase when the pool has insufficient tokens", () => {
    const state = createState();
    state.poolHolding = new TokenHolding({
      userId: "pool-id",
      playerId: "player-id",
      quantity: 2,
      averagePurchasePrice: 1,
    });

    expect(() => marketTrade.buyFromPool(purchaseRequest(), state)).toThrow(
      new BusinessConflictError("Insufficient tokens in central pool"),
    );
  });

  it("rejects a purchase when the investor has insufficient credits", () => {
    const state = createState();
    state.investor = new User({
      id: "investor-id",
      name: "Investor",
      email: "investor@example.com",
      password: "secret",
      creditBalance: 20,
    });

    expect(() => marketTrade.buyFromPool(purchaseRequest(), state)).toThrow(
      new BusinessConflictError("Insufficient credit balance"),
    );
  });

});
