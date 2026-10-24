import { describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "@/backend/errors/http.error";
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

  it("returns persisted history without recalculating values", async () => {
    const findOperationsByInvestorId = vi.fn().mockResolvedValue({
      rows: [{
        id: "operation-id",
        type: "BUY",
        investorId: "investor-id",
        playerId: "player-id",
        quoteId: "quote-id",
        quoteValue: "82.50",
        quantity: 3,
        total: "247.50",
        unit: "CREDIT_PER_TOKEN",
        correlationId: null,
        createdAt: new Date("2026-10-24T15:00:00.000Z"),
      }],
      hasMore: false,
    });
    const service = new MarketOperationService({ findOperationsByInvestorId } as never, {} as never);

    await expect(service.getHistory(auth, "investor-id", { limit: 50, offset: 0 })).resolves.toEqual({
      items: [{
        id: "operation-id",
        type: "BUY",
        playerId: "player-id",
        quantity: 3,
        quoteId: "quote-id",
        quoteValue: 82.5,
        total: 247.5,
        unit: "CREDIT_PER_TOKEN",
        createdAt: new Date("2026-10-24T15:00:00.000Z"),
        correlationId: null,
      }],
      limit: 50,
      offset: 0,
      hasMore: false,
    });

    expect(findOperationsByInvestorId).toHaveBeenCalledWith("investor-id", 50, 0);
  });

  it("rejects another user before reading history", async () => {
    const findOperationsByInvestorId = vi.fn();
    const service = new MarketOperationService({ findOperationsByInvestorId } as never, {} as never);

    await expect(service.getHistory(auth, "other-user", { limit: 50, offset: 0 }))
      .rejects.toBeInstanceOf(ForbiddenError);
    expect(findOperationsByInvestorId).not.toHaveBeenCalled();
  });
});
