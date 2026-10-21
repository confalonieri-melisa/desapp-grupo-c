import { describe, expect, it, vi } from "vitest";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";
import { buildValuationConfig } from "@/backend/services/valuation-strategy.service";

describe("ValuationRepository append-only quotes", () => {
  it("inserts two quotes for the same player without relying on timestamp uniqueness", async () => {
    const insert = vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: crypto.randomUUID() }]),
      })),
    }));
    const repository = new ValuationRepository({ insert } as never);
    const quote = {
      playerId: "player",
      strategyVersionId: "version",
      individualScore: 0.5,
      teamScore: null,
      finalScore: 0.5,
      quoteValue: 50.5,
      explanation: {},
    };

    await repository.saveQuote(quote);
    await repository.saveQuote(quote);

    expect(insert).toHaveBeenCalledTimes(2);
  });
});

describe("ValuationRepository strategy versions", () => {
  it("returns the active strategy version or null", async () => {
    const active = { id: "version-1", isActive: 1 };
    const limit = vi.fn().mockResolvedValue([active]);
    const database = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit })),
        })),
      })),
    };

    await expect(new ValuationRepository(database as never).findActiveStrategyVersion())
      .resolves.toEqual(active);

    limit.mockResolvedValueOnce([]);
    await expect(new ValuationRepository(database as never).findActiveStrategyVersion())
      .resolves.toBeNull();
  });

  it("activates an existing version after deactivating previous versions", async () => {
    const existing = { id: "version-1", strategyCode: "INDIVIDUAL_PERFORMANCE", version: "1.0.0" };
    const activated = { ...existing, isActive: 1 };
    const tx = createTransaction([existing], activated);
    const database = { transaction: vi.fn(async (callback: (value: unknown) => unknown) => callback(tx)) };

    await expect(new ValuationRepository(database as never).activateStrategyVersion(
      "INDIVIDUAL_PERFORMANCE",
      "1.0.0",
      buildValuationConfig("INDIVIDUAL_PERFORMANCE"),
      "admin-1",
    )).resolves.toEqual(activated);

    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).toHaveBeenCalledTimes(2);
  });

  it("creates and activates a version when it does not exist", async () => {
    const created = { id: "version-2", strategyCode: "INDIVIDUAL_PERFORMANCE", version: "1.0.0" };
    const activated = { ...created, isActive: 1 };
    const tx = createTransaction([], activated, created);
    const database = { transaction: vi.fn(async (callback: (value: unknown) => unknown) => callback(tx)) };

    await expect(new ValuationRepository(database as never).activateStrategyVersion(
      "INDIVIDUAL_PERFORMANCE",
      "1.0.0",
      buildValuationConfig("INDIVIDUAL_PERFORMANCE"),
      "admin-1",
    )).resolves.toEqual(activated);

    expect(tx.insert).toHaveBeenCalledTimes(1);
  });

  it("fails explicitly when version creation returns no row", async () => {
    const tx = createTransaction([], undefined, undefined, []);
    const database = { transaction: vi.fn(async (callback: (value: unknown) => unknown) => callback(tx)) };

    await expect(new ValuationRepository(database as never).activateStrategyVersion(
      "INDIVIDUAL_PERFORMANCE",
      "1.0.0",
      buildValuationConfig("INDIVIDUAL_PERFORMANCE"),
      "admin-1",
    )).rejects.toThrow("Valuation version could not be created");
  });
});

function createTransaction(
  existing: unknown[],
  activated?: unknown,
  created?: unknown,
  createdRows = created ? [created] : undefined,
) {
  const limit = vi.fn().mockResolvedValue(existing);
  const insertReturning = vi.fn().mockResolvedValue(createdRows ?? []);
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: insertReturning })),
    })),
    update: vi.fn()
      .mockImplementationOnce(() => ({ set: vi.fn().mockResolvedValue([]) }))
      .mockImplementationOnce(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue(activated ? [activated] : []) })),
        })),
      })),
  };
}
