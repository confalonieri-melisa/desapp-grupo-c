import { describe, expect, it, vi } from "vitest";
import { MarketOperationController } from "@/backend/controllers/market-operation.controller";

describe("MarketOperationController", () => {
  it("returns the operation result without exposing audit snapshots", async () => {
    const service = {
      buy: vi.fn().mockResolvedValue({
        operation: {
          id: "operation-id",
          type: "BUY",
          investorId: "investor-id",
          playerId: "player-id",
          quoteValue: 10,
          quantity: 2,
          total: 20,
          createdAt: new Date("2026-10-24T15:00:00.000Z"),
        },
        creditBalance: 980,
        holding: { quantity: 2, averagePurchasePrice: 10 },
      }),
    };
    const controller = new MarketOperationController(service as never);

    const result = await controller.buy(
      { sub: "investor-id", email: "investor@example.com", role: "INVESTOR" },
      { playerId: "player-id", quantity: 2 },
    );

    expect(result).toEqual({
      operation: {
        id: "operation-id",
        type: "BUY",
        userId: "investor-id",
        playerId: "player-id",
        quantity: 2,
        quoteValue: 10,
        total: 20,
        createdAt: new Date("2026-10-24T15:00:00.000Z"),
      },
      account: { creditBalance: 980 },
      holding: { quantity: 2, averagePurchasePrice: 10 },
    });
  });

  it("serializes a sell with the authenticated user id", async () => {
    const service = {
      sell: vi.fn().mockResolvedValue({
        operation: {
          id: "operation-id",
          type: "SELL",
          investorId: "investor-id",
          playerId: "player-id",
          quoteValue: 10,
          quantity: 1,
          total: 10,
          createdAt: new Date("2026-10-24T15:00:00.000Z"),
        },
        creditBalance: 1010,
        holding: { quantity: 2, averagePurchasePrice: 10 },
      }),
    };
    const controller = new MarketOperationController(service as never);

    await expect(controller.sell(
      { sub: "investor-id", email: "investor@example.com", role: "INVESTOR" },
      { playerId: "player-id", quantity: 1 },
    )).resolves.toMatchObject({
      operation: { type: "SELL", userId: "investor-id" },
      account: { creditBalance: 1010 },
      holding: { quantity: 2 },
    });
  });
});
