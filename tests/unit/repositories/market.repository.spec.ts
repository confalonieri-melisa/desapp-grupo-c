import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/backend/db";
import { MarketRepository } from "@/backend/repositories/market.repository";
import { MarketTrade } from "@/backend/models/MarketTrade";
import { UserRole } from "@/backend/models/enums";

const investorId = "investor-id";
const poolId = "pool-id";
const playerId = "player-id";

function userRow(id: string, role: UserRole, creditBalance: string) {
  return {
    id,
    email: `${id}@example.com`,
    password: "secret",
    name: id,
    role,
    creditBalance,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function query(rows: unknown[]) {
  const builder = {
    from: vi.fn(() => builder),
    innerJoin: vi.fn(() => builder),
    where: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    limit: vi.fn(async () => rows),
    for: vi.fn(async () => rows),
  };
  return builder;
}

function tradeDatabase() {
  const playersQuery = query([{ id: playerId }]);
  const investorQuery = query([userRow(investorId, UserRole.INVESTOR, "1000.00")]);
  const poolQuery = query([userRow(poolId, UserRole.SUPERUSER, "500.00")]);
  const holdingsQuery = query([
    {
      id: "pool-holding-id",
      userId: poolId,
      playerId,
      quantity: 100,
      averagePurchasePrice: "1.00",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ]);
  const queries = [playersQuery, investorQuery, poolQuery, holdingsQuery];
  const update = vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(async () => []),
    })),
  }));
  const insert = vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(async () => [{}]),
    })),
  }));
  const transaction = vi.fn(async (callback: (tx: Database) => Promise<unknown>) =>
    callback({
      select: vi.fn(() => queries.shift()),
      update,
      insert,
    } as unknown as Database),
  );

  return {
    database: { transaction } as unknown as Database,
    transaction,
    update,
    insert,
    queries,
  };
}

describe("MarketRepository", () => {
  it("loads the locked trade state and persists the complete operation in one transaction", async () => {
    const fake = tradeDatabase();
    const repository = new MarketRepository(fake.database, {
      findLatestForPlayer: vi.fn().mockResolvedValue({
        id: "quote-id",
        quoteValue: 10,
        unit: "CREDIT_PER_TOKEN",
      }),
    } as never);

    const idempotencyRows = query([
      {
        id: "idempotency-id",
        userId: investorId,
        key: "buy-key",
        playerId,
        quantity: 3,
        responseBody: null,
      },
    ]);
    const fakeInsert = vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(async () => []),
      })),
    }));
    const selectQueries = [idempotencyRows, ...fake.queries];
    fake.transaction.mockImplementationOnce(
      async (callback: (tx: Database) => Promise<unknown>) =>
        callback({
          select: vi.fn(() => selectQueries.shift()),
          update: fake.update,
          insert: fakeInsert,
        } as unknown as Database),
    );

    const result = await repository.executeTokenPurchase(
      {
        investorId,
        playerId,
        quantity: 3,
      },
      (state) =>
        new MarketTrade().buyFromPool(
          {
            investorId,
            playerId,
            quantity: 3,
          },
          state,
        ),
      { key: "buy-key", playerId, quantity: 3 },
    );

    expect(fake.transaction).toHaveBeenCalledOnce();
    expect(result.creditBalance).toBe(970);
    expect(result.holding.quantity).toBe(3);
    expect(fake.update).toHaveBeenCalledTimes(4);
    expect(fakeInsert).toHaveBeenCalledTimes(4);
  });

  it("assigns the initial tokens idempotently to the central pool", async () => {
    const values = vi.fn(() => ({
      onConflictDoNothing: vi.fn(async () => []),
    }));
    const insert = vi.fn(() => ({ values }));
    const transaction = vi.fn(async (callback: (tx: Database) => Promise<unknown>) =>
      callback({
        select: vi.fn(() => query([userRow(poolId, UserRole.SUPERUSER, "500.00")])),
        insert,
      } as unknown as Database),
    );
    const repository = new MarketRepository({ transaction } as unknown as Database);

    await repository.assignInitialTokens([playerId]);

    expect(transaction).toHaveBeenCalledOnce();
    expect(values).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: poolId,
        playerId,
        quantity: 100,
        averagePurchasePrice: "1.00",
      }),
    ]);
  });
});
