import { describe, expect, it, vi } from "vitest";
import { PortfolioService } from "@/backend/services/portfolio.service";
import { TokenHolding } from "@/backend/models/TokenHolding";
import { User } from "@/backend/models/User";

describe("PortfolioService", () => {
  it("queries only the authenticated subject", async () => {
    const findById = vi.fn().mockResolvedValue(new User({
      id: "investor-id",
      name: "Investor",
      email: "investor@example.com",
      password: "hashed-password",
      creditBalance: 1000,
    }));
    const findPositionsByUserId = vi.fn().mockResolvedValue([]);
    const service = new PortfolioService(
      { findById } as never,
      { findPositionsByUserId } as never,
    );

    await expect(service.getPortfolio({
      sub: "investor-id",
      email: "investor@example.com",
      role: "INVESTOR",
    })).resolves.toEqual({ creditBalance: 1000, items: [] });

    expect(findById).toHaveBeenCalledWith("investor-id");
    expect(findPositionsByUserId).toHaveBeenCalledWith("investor-id");
  });

  it("derives current value and unrealized pnl from the latest quote", async () => {
    const holding = new TokenHolding({
      id: "holding-id",
      userId: "investor-id",
      playerId: "player-id",
      quantity: 3,
      averagePurchasePrice: 10,
    });
    const findById = vi.fn().mockResolvedValue(new User({
      id: "investor-id",
      name: "Investor",
      email: "investor@example.com",
      password: "hashed-password",
      creditBalance: 1000,
    }));
    const findPositionsByUserId = vi.fn().mockResolvedValue([holding]);
    const findLatestForPlayer = vi.fn().mockResolvedValue({
      quoteValue: 12.5,
    });
    const service = new PortfolioService(
      { findById } as never,
      { findPositionsByUserId } as never,
      { findLatestForPlayer } as never,
    );

    await expect(service.getPortfolio({
      sub: "investor-id",
      email: "investor@example.com",
      role: "INVESTOR",
    })).resolves.toEqual({
      creditBalance: 1000,
      items: [{
        playerId: "player-id",
        quantity: 3,
        averagePurchasePrice: 10,
        currentQuoteValue: 12.5,
        currentValue: 37.5,
        unrealizedPnl: 7.5,
      }],
    });
    expect(findLatestForPlayer).toHaveBeenCalledWith("player-id");
  });

  it("keeps derived values unavailable when no current quote exists", async () => {
    const findById = vi.fn().mockResolvedValue(new User({
      id: "investor-id",
      name: "Investor",
      email: "investor@example.com",
      password: "hashed-password",
    }));
    const findPositionsByUserId = vi.fn().mockResolvedValue([new TokenHolding({
      userId: "investor-id",
      playerId: "player-id",
      quantity: 1,
      averagePurchasePrice: 10,
    })]);
    const service = new PortfolioService(
      { findById } as never,
      { findPositionsByUserId } as never,
      { findLatestForPlayer: vi.fn().mockResolvedValue(null) } as never,
    );

    await expect(service.getPortfolio({
      sub: "investor-id",
      email: "investor@example.com",
      role: "INVESTOR",
    })).resolves.toMatchObject({
      items: [{
        currentQuoteValue: null,
        currentValue: null,
        unrealizedPnl: null,
      }],
    });
  });
});
