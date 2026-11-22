import { describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "@/backend/errors/application.error";
import { MarketOperationService } from "@/backend/services/market-operation.service";

const auth = {
  sub: "investor-id",
  email: "investor@example.com",
  role: "INVESTOR",
};

describe("MarketOperationService", () => {
  it("delegates a buy using the authenticated subject", async () => {
    const executeTokenPurchase = vi.fn().mockResolvedValue({
      operation: { type: "BUY" },
      creditBalance: 900,
      holding: { quantity: 1 },
    });
    const service = new MarketOperationService({ executeTokenPurchase } as never, {} as never);

    await expect(
      service.buy(
        auth,
        {
          playerId: "player-id",
          quantity: 1,
        },
        "buy-key",
        undefined,
      ),
    ).resolves.toMatchObject({
      operation: { type: "BUY" },
      creditBalance: 900,
      holding: { quantity: 1 },
    });

    expect(executeTokenPurchase).toHaveBeenCalledWith(
      {
        investorId: "investor-id",
        playerId: "player-id",
        quantity: 1,
        correlationId: undefined,
      },
      expect.any(Function),
      { key: "buy-key", playerId: "player-id", quantity: 1 },
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
          playerId: "player-id",
          quantity: 3,
          quoteId: "quote-id",
          quoteValue: 82.5,
          total: 247.5,
          unit: "CREDIT_PER_TOKEN",
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
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(findOperationsByInvestorId).not.toHaveBeenCalled();
  });
});
