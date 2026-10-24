import { describe, expect, it, vi } from "vitest";
import { MarketOperationService } from "@/backend/services/market-operation.service";

const auth = {
  sub: "investor-id",
  email: "investor@example.com",
  role: "INVESTOR",
};

describe("MarketOperationService", () => {
  it("delegates a buy using the authenticated subject", async () => {
    const state = { investor: { creditBalance: 900 } };
    const outcome = { operation: { type: "BUY" }, investorHolding: { quantity: 1 } };
    const buy = vi.fn().mockReturnValue(outcome);
    const executeTrade = vi.fn().mockImplementation(async (_request, applyTrade) => ({
      outcome: applyTrade(state),
      creditBalance: state.investor.creditBalance,
    }));
    const service = new MarketOperationService({ executeTrade } as never, { buy } as never);

    await expect(service.buy(auth, {
      playerId: "player-id",
      quantity: 1,
    })).resolves.toMatchObject({
      operation: { type: "BUY" },
      creditBalance: 900,
      holding: { quantity: 1 },
    });

    expect(executeTrade).toHaveBeenCalledWith({
      type: "BUY",
      investorId: "investor-id",
      playerId: "player-id",
      quantity: 1,
      correlationId: undefined,
    }, expect.any(Function));
    expect(buy).toHaveBeenCalledWith(expect.objectContaining({ investorId: "investor-id" }), state);
  });

  it("delegates a sell without accepting an investor id from the request", async () => {
    const state = { investor: { creditBalance: 900 } };
    const outcome = { operation: { type: "SELL" }, investorHolding: { quantity: 1 } };
    const sell = vi.fn().mockReturnValue(outcome);
    const executeTrade = vi.fn().mockImplementation(async (_request, applyTrade) => ({
      outcome: applyTrade(state),
      creditBalance: state.investor.creditBalance,
    }));
    const service = new MarketOperationService({ executeTrade } as never, { sell } as never);

    await service.sell(auth, { playerId: "player-id", quantity: 2 }, "request-id");

    expect(executeTrade).toHaveBeenCalledWith({
      type: "SELL",
      investorId: "investor-id",
      playerId: "player-id",
      quantity: 2,
      correlationId: "request-id",
    }, expect.any(Function));
    expect(sell).toHaveBeenCalledWith(expect.objectContaining({ investorId: "investor-id" }), state);
  });
});
