import { describe, expect, it } from "vitest";
import { ConflictError } from "@/backend/errors/http.error";
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

describe("MarketTrade", () => {
  it("settles a purchase against the central pool", () => {
    const state = createState();
    const outcome = marketTrade.buy({
      type: "BUY",
      investorId: "investor-id",
      playerId: "player-id",
      quantity: 3,
    }, state);

    expect(state.investor.creditBalance).toBe(70);
    expect(state.pool.creditBalance).toBe(530);
    expect(outcome.investorHolding.quantity).toBe(3);
    expect(outcome.poolHolding.quantity).toBe(97);
    expect(outcome.audit.newState.investor.quantity).toBe(3);
  });

  it("settles a sale back to the central pool", () => {
    const state = createState();
    state.investorHolding = new TokenHolding({
      userId: "investor-id",
      playerId: "player-id",
      quantity: 3,
      averagePurchasePrice: 10,
    });
    state.investorHoldingExists = true;

    const outcome = marketTrade.sell({
      type: "SELL",
      investorId: "investor-id",
      playerId: "player-id",
      quantity: 1,
    }, state);

    expect(state.investor.creditBalance).toBe(110);
    expect(state.pool.creditBalance).toBe(490);
    expect(outcome.investorHolding.quantity).toBe(2);
    expect(outcome.poolHolding.quantity).toBe(101);
  });

  it("rejects a purchase when the pool has insufficient tokens", () => {
    const state = createState();
    state.poolHolding = new TokenHolding({
      userId: "pool-id",
      playerId: "player-id",
      quantity: 2,
      averagePurchasePrice: 1,
    });

    expect(() => marketTrade.buy({
      type: "BUY",
      investorId: "investor-id",
      playerId: "player-id",
      quantity: 3,
    }, state)).toThrow(new ConflictError("Insufficient tokens in central pool"));
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

    expect(() => marketTrade.buy({
      type: "BUY",
      investorId: "investor-id",
      playerId: "player-id",
      quantity: 3,
    }, state)).toThrow(new ConflictError("Insufficient credit balance"));
  });

  it("rejects a sale when the investor has no sufficient holding", () => {
    const state = createState();

    expect(() => marketTrade.sell({
      type: "SELL",
      investorId: "investor-id",
      playerId: "player-id",
      quantity: 1,
    }, state)).toThrow(new ConflictError("Insufficient token holding"));
  });

  it("rejects a sale when the pool has insufficient credits", () => {
    const state = createState();
    state.pool = new User({
      id: "pool-id",
      name: "Pool",
      email: "pool@example.com",
      role: UserRole.SUPERUSER,
      password: "secret",
      creditBalance: 0,
    });
    state.investorHolding = new TokenHolding({
      userId: "investor-id",
      playerId: "player-id",
      quantity: 3,
      averagePurchasePrice: 10,
    });
    state.investorHoldingExists = true;

    expect(() => marketTrade.sell({
      type: "SELL",
      investorId: "investor-id",
      playerId: "player-id",
      quantity: 1,
    }, state)).toThrow(new ConflictError("Insufficient central pool balance"));
  });

  it("rejects the central pool as an investor", () => {
    const state = createState();
    state.investor = new User({
      id: "pool-id",
      name: "Pool",
      email: "pool@example.com",
      password: "secret",
      role: UserRole.SUPERUSER,
      creditBalance: 500,
    });

    expect(() => marketTrade.buy({
      type: "BUY",
      investorId: "pool-id",
      playerId: "player-id",
      quantity: 1,
    }, state)).toThrow(new ConflictError("The central pool cannot operate as an investor"));
  });
});
