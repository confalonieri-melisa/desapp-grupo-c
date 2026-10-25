import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/backend/db";
import { PortfolioRepository } from "@/backend/repositories/portfolio.repository";

describe("PortfolioRepository", () => {
  it("returns only active holdings for the requested user", async () => {
    const holdings = [{
      id: "holding-id",
      userId: "investor-id",
      playerId: "player-id",
      quantity: 3,
      averagePurchasePrice: "10.00",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    }];
    const query = {
      from: vi.fn(() => query),
      where: vi.fn(async () => holdings),
    };
    const database = {
      select: vi.fn(() => query),
    } as unknown as Database;
    const repository = new PortfolioRepository(database);

    await expect(repository.findPositionsByUserId("investor-id")).resolves.toMatchObject([
      {
        id: "holding-id",
        userId: "investor-id",
        playerId: "player-id",
        quantity: 3,
        averagePurchasePrice: 10,
      },
    ]);
    expect(database.select).toHaveBeenCalledOnce();
  });
});
