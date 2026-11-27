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

function tradeDatabase(existingOperation?: Record<string, unknown>) {
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
  const operationQuery = query(existingOperation ? [existingOperation] : []);
  const queries = [playersQuery, investorQuery, poolQuery, holdingsQuery, operationQuery];
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
  };
}

describe("MarketRepository", () => {
  it("reserves only the available part of a holding", async () => {
    const updateWhere = vi.fn(async () => []);
    const update = vi.fn(() => ({
      set: vi.fn(() => ({ where: updateWhere })),
    }));
    const transaction = {
      select: vi.fn(() =>
        query([
          {
            id: "holding-id",
            userId: investorId,
            playerId,
            quantity: 5,
            reservedQuantity: 0,
            averagePurchasePrice: "10.00",
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ]),
      ),
      update,
    } as unknown as Database;
    const repository = new MarketRepository({} as Database);

    await repository.reserveTokensForOffer(transaction, investorId, playerId, 4);

    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.results[0].value.set).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 5, reservedQuantity: 4 }),
    );
  });

  it("rejects a reservation beyond the available quantity", async () => {
    const update = vi.fn();
    const transaction = {
      select: vi.fn(() =>
        query([
          {
            id: "holding-id",
            userId: investorId,
            playerId,
            quantity: 5,
            reservedQuantity: 4,
            averagePurchasePrice: "10.00",
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ]),
      ),
      update,
    } as unknown as Database;
    const repository = new MarketRepository({} as Database);

    await expect(
      repository.reserveTokensForOffer(transaction, investorId, playerId, 2),
    ).rejects.toMatchObject({ status: 409 });
    expect(update).not.toHaveBeenCalled();
  });

  it("releases a reservation from the locked holding", async () => {
    const updateWhere = vi.fn(async () => []);
    const update = vi.fn(() => ({
      set: vi.fn(() => ({ where: updateWhere })),
    }));
    const transaction = {
      select: vi.fn(() =>
        query([
          {
            id: "holding-id",
            userId: investorId,
            playerId,
            quantity: 5,
            reservedQuantity: 4,
            averagePurchasePrice: "10.00",
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ]),
      ),
      update,
    } as unknown as Database;
    const repository = new MarketRepository({} as Database);

    await repository.releaseReservedTokens(transaction, investorId, playerId, 4);

    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.results[0].value.set).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 5, reservedQuantity: 0 }),
    );
  });

  it("loads the locked trade state and persists the complete operation in one transaction", async () => {
    const fake = tradeDatabase();
    const repository = new MarketRepository(fake.database, {
      findLatestForPlayer: vi.fn().mockResolvedValue({
        id: "quote-id",
        quoteValue: 10,
        unit: "CREDIT_PER_TOKEN",
      }),
    } as never);

    const result = await repository.executeTrade(
      {
        type: "BUY",
        investorId,
        playerId,
        quantity: 3,
      },
      (state) =>
        new MarketTrade().buy(
          {
            type: "BUY",
            investorId,
            playerId,
            quantity: 3,
          },
          state,
        ),
    );

    expect(fake.transaction).toHaveBeenCalledOnce();
    expect(result.creditBalance).toBe(970);
    expect(result.holding.quantity).toBe(3);
    expect(fake.update).toHaveBeenCalledTimes(3);
    expect(fake.insert).toHaveBeenCalledTimes(3);
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

  it("replays an existing operation without writing a second trade", async () => {
    const fake = tradeDatabase({
      id: "operation-id",
      type: "BUY",
      investorId,
      playerId,
      quoteId: "quote-id",
      quoteValue: "10.00",
      quantity: 3,
      total: "30.00",
      unit: "CREDIT_PER_TOKEN",
      correlationId: null,
      idempotencyKey: "buy-key",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const repository = new MarketRepository(fake.database, {
      findLatestForPlayer: vi.fn().mockResolvedValue({
        id: "quote-id",
        quoteValue: 10,
        unit: "CREDIT_PER_TOKEN",
      }),
    } as never);
    const applyTrade = vi.fn();

    const result = await repository.executeTrade(
      { type: "BUY", investorId, playerId, quantity: 3, idempotencyKey: "buy-key" },
      applyTrade,
    );

    expect(result.operation.id).toBe("operation-id");
    expect(result.creditBalance).toBe(1000);
    expect(result.holding.quantity).toBe(0);
    expect(applyTrade).not.toHaveBeenCalled();
    expect(fake.update).not.toHaveBeenCalled();
    expect(fake.insert).not.toHaveBeenCalled();
  });

  it("rejects reusing an idempotency key for different order data", async () => {
    const fake = tradeDatabase({
      id: "operation-id",
      type: "BUY",
      investorId,
      playerId,
      quoteId: "quote-id",
      quoteValue: "10.00",
      quantity: 3,
      total: "30.00",
      unit: "CREDIT_PER_TOKEN",
      correlationId: null,
      idempotencyKey: "buy-key",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const repository = new MarketRepository(fake.database, {
      findLatestForPlayer: vi.fn().mockResolvedValue({
        id: "quote-id",
        quoteValue: 10,
        unit: "CREDIT_PER_TOKEN",
      }),
    } as never);

    await expect(
      repository.executeTrade(
        { type: "BUY", investorId, playerId, quantity: 4, idempotencyKey: "buy-key" },
        vi.fn(),
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(fake.update).not.toHaveBeenCalled();
    expect(fake.insert).not.toHaveBeenCalled();
  });
});
