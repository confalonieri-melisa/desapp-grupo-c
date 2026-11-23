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
    const executeTrade = vi.fn().mockImplementation(async (_request, applyTrade) => {
      const trade = applyTrade(state);
      return {
        operation: trade.operation,
        creditBalance: state.investor.creditBalance,
        holding: trade.investorHolding,
      };
    });
    const service = new MarketOperationService({ executeTrade } as never, { buy } as never);

    await expect(
      service.buy(auth, {
        playerId: "player-id",
        quantity: 1,
      }),
    ).resolves.toMatchObject({
      operation: { type: "BUY" },
      creditBalance: 900,
      holding: { quantity: 1 },
    });

    expect(executeTrade).toHaveBeenCalledWith(
      {
        type: "BUY",
        investorId: "investor-id",
        playerId: "player-id",
        quantity: 1,
        correlationId: undefined,
      },
      expect.any(Function),
    );
    expect(buy).toHaveBeenCalledWith(expect.objectContaining({ investorId: "investor-id" }), state);
  });

  it("delegates a sell without accepting an investor id from the request", async () => {
    const state = { investor: { creditBalance: 900 } };
    const outcome = { operation: { type: "SELL" }, investorHolding: { quantity: 1 } };
    const sell = vi.fn().mockReturnValue(outcome);
    const executeTrade = vi.fn().mockImplementation(async (_request, applyTrade) => {
      const trade = applyTrade(state);
      return {
        operation: trade.operation,
        creditBalance: state.investor.creditBalance,
        holding: trade.investorHolding,
      };
    });
    const service = new MarketOperationService({ executeTrade } as never, { sell } as never);

    await service.sell(auth, { playerId: "player-id", quantity: 2 }, "request-id", "sell-key");

    expect(executeTrade).toHaveBeenCalledWith(
      {
        type: "SELL",
        investorId: "investor-id",
        playerId: "player-id",
        quantity: 2,
        correlationId: "request-id",
        idempotencyKey: "sell-key",
      },
      expect.any(Function),
    );
    expect(sell).toHaveBeenCalledWith(
      expect.objectContaining({ investorId: "investor-id" }),
      state,
    );
  });

  it("returns persisted history without recalculating values", async () => {
    const findOperationsByInvestorId = vi.fn().mockResolvedValue({
      rows: [
        {
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
        },
      ],
      hasMore: false,
    });
    const service = new MarketOperationService(
      { findOperationsByInvestorId } as never,
      {} as never,
    );

    await expect(
      service.getHistory(auth, "investor-id", { limit: 50, offset: 0 }),
    ).resolves.toEqual({
      items: [
        {
          id: "operation-id",
          type: "BUY",
          market: "CENTRAL",
          playerId: "player-id",
          quantity: 3,
          quoteId: "quote-id",
          quoteValue: 82.5,
          total: 247.5,
          unit: "CREDIT_PER_TOKEN",
          buyerId: undefined,
          sellerId: undefined,
          offerId: undefined,
          createdAt: new Date("2026-10-24T15:00:00.000Z"),
          correlationId: null,
        },
      ],
      limit: 50,
      offset: 0,
      hasMore: false,
    });

    expect(findOperationsByInvestorId).toHaveBeenCalledWith("investor-id", 50, 0);
  });

  it("rejects another user before reading history", async () => {
    const findOperationsByInvestorId = vi.fn();
    const service = new MarketOperationService(
      { findOperationsByInvestorId } as never,
      {} as never,
    );

    await expect(
      service.getHistory(auth, "other-user", { limit: 50, offset: 0 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(findOperationsByInvestorId).not.toHaveBeenCalled();
  });

  it("projects the same P2P operation as buy and sell for each participant", async () => {
    const row = {
      id: "p2p-operation-id",
      type: "BUY",
      investorId: "buyer-id",
      buyerId: "buyer-id",
      sellerId: "seller-id",
      offerId: "offer-id",
      playerId: "player-id",
      quoteId: null,
      quoteValue: "12.50",
      quantity: 2,
      total: "25.00",
      unit: "CREDIT_PER_TOKEN",
      correlationId: null,
      createdAt: new Date("2026-10-24T15:00:00.000Z"),
    };
    const findOperationsByInvestorId = vi.fn().mockResolvedValue({ rows: [row], hasMore: false });
    const service = new MarketOperationService({ findOperationsByInvestorId } as never, {} as never);

    const buyerHistory = await service.getHistory(
      { ...auth, sub: "buyer-id", email: "buyer@test.local" },
      "buyer-id",
      { limit: 50, offset: 0 },
    );
    const sellerHistory = await service.getHistory(
      { ...auth, sub: "seller-id", email: "seller@test.local" },
      "seller-id",
      { limit: 50, offset: 0 },
    );

    expect(buyerHistory.items[0]).toMatchObject({ id: "p2p-operation-id", type: "BUY", market: "P2P" });
    expect(sellerHistory.items[0]).toMatchObject({ id: "p2p-operation-id", type: "SELL", market: "P2P" });
  });
});
