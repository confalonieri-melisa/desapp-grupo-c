import { describe, expect, it, vi } from "vitest";
import { toPlayer } from "@/repositories/player.repository";
import { toUser } from "@/repositories/user.repository";
import { League, Position, UserRole } from "@/models/enums";
import { Player } from "@/models/Player";
import { User } from "@/models/User";
import { PlayerRepository } from "@/repositories/player.repository";
import { UserRepository } from "@/repositories/user.repository";
import type { Database } from "@/db";

describe("persistence domain mappings", () => {
  it("maps a user row to the User aggregate", () => {
    const user = toUser({
      id: "00000000-0000-0000-0000-000000000001",
      email: "alice@example.com",
      password: "secret",
      name: "Alice",
      role: UserRole.INVESTOR,
      creditBalance: "1000.00",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(user.id).toBe("00000000-0000-0000-0000-000000000001");
    expect(user.creditBalance).toBe(1000);
    expect(user.password).toBe("secret");
  });

  it("maps a player row to the Player aggregate", () => {
    const row = {
      id: "00000000-0000-0000-0000-000000000002",
      source: "WHOSCORED",
      externalId: "42",
      name: "Player",
      team: "Team",
      league: League.PREMIER_LEAGUE,
      position: Position.FORWARD,
      statistics: { goals: 2 },
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const player = toPlayer(row);
    expect(player.statistics).toEqual({ goals: 2 });
  });
});

function selectDatabase(rows: unknown[]): Database {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => rows),
        })),
      })),
    })),
  } as unknown as Database;
}

function playerSearchDatabase(
  playerRows: unknown[],
  total: number,
): { database: Database; orderBy: ReturnType<typeof vi.fn> } {
  const dataQuery = {
    from: vi.fn(() => dataQuery),
    where: vi.fn(() => dataQuery),
    orderBy: vi.fn(() => dataQuery),
    limit: vi.fn(() => dataQuery),
    offset: vi.fn(async () => playerRows),
  };
  const countQuery = {
    from: vi.fn(() => countQuery),
    where: vi.fn(() => countQuery),
    then: (resolve: (value: unknown[]) => unknown) =>
      Promise.resolve(resolve([{ count: total }])),
  };
  let selectCall = 0;

  return {
    database: {
    select: vi.fn(() => {
      selectCall += 1;
      return selectCall === 1 ? dataQuery : countQuery;
    }),
    } as unknown as Database,
    orderBy: dataQuery.orderBy,
  };
}

function insertDatabase(rows: unknown[]): Database {
  const returning = vi.fn(async () => rows);
  const insert = vi.fn(() => ({
    values: vi.fn(() => ({
      returning,
      onConflictDoUpdate: vi.fn(() => ({ returning })),
    })),
  }));

  return { insert } as unknown as Database;
}

describe("UserRepository", () => {
  const userRow = {
    id: "00000000-0000-0000-0000-000000000003",
    email: "lola.gol@example.test",
    password: "Gol2026!",
    name: "Lola Gol",
    role: UserRole.INVESTOR,
    creditBalance: "1000.00",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  it("finds users by id and email and returns null when absent", async () => {
    const repository = new UserRepository(selectDatabase([userRow]));

    await expect(repository.findById(userRow.id)).resolves.toMatchObject({
      email: userRow.email,
    });
    await expect(repository.findByEmail(userRow.email)).resolves.toMatchObject({
      id: userRow.id,
    });
    await expect(
      new UserRepository(selectDatabase([])).findByEmail(userRow.email),
    ).resolves.toBeNull();
  });

  it("persists and maps a user", async () => {
    const user = new User({
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      password: userRow.password,
    });
    const repository = new UserRepository(insertDatabase([userRow]));

    await expect(repository.save(user)).resolves.toMatchObject({
      id: user.id,
      creditBalance: 1000,
    });
  });

  it("fails explicitly when persistence returns no user", async () => {
    const repository = new UserRepository(insertDatabase([]));
    const user = new User({
      email: userRow.email,
      name: userRow.name,
      password: userRow.password,
    });

    await expect(repository.save(user)).rejects.toThrow(
      "User could not be persisted",
    );
  });
});

describe("PlayerRepository", () => {
  const player = new Player({
    id: "00000000-0000-0000-0000-000000000004",
    name: "Lola Gol",
    team: "Club Atlético Ejemplo",
    league: League.LA_LIGA,
    position: Position.FORWARD,
    statistics: { goals: 10 },
  });

  it("persists multiple players in one transaction and maps them", async () => {
    const transaction = insertDatabase([
      {
        id: player.id,
        source: "TEST",
        externalId: "lola-10",
        name: player.name,
        team: player.team,
        league: player.league,
        position: player.position,
        statistics: player.statistics,
        createdAt: player.createdAt,
        updatedAt: player.updatedAt,
      },
    ]);
    const database = {
      transaction: vi.fn(async (callback: (db: Database) => Promise<unknown>) =>
        callback(transaction),
      ),
    } as unknown as Database;

    await expect(
      new PlayerRepository(database).savePlayers([
        { player, source: "TEST", externalId: "lola-10" },
      ]),
    ).resolves.toMatchObject([{ id: player.id, name: player.name }]);
  });

  it("fails explicitly when a player cannot be persisted", async () => {
    const transaction = insertDatabase([]);
    const database = {
      transaction: vi.fn(async (callback: (db: Database) => Promise<unknown>) =>
        callback(transaction),
      ),
    } as unknown as Database;

    await expect(
      new PlayerRepository(database).savePlayers([
        { player, source: "TEST", externalId: "lola-10" },
      ]),
    ).rejects.toThrow("Player could not be persisted");
  });

  it("finds a paginated catalog and total count", async () => {
    const playerRow = {
      id: player.id,
      source: "TEST",
      externalId: "lola-10",
      name: player.name,
      team: player.team,
      league: player.league,
      position: player.position,
      statistics: player.statistics,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt,
    };
    const { database, orderBy } = playerSearchDatabase([playerRow], 25);

    await expect(
      new PlayerRepository(database).findMany(
        {
          league: League.LA_LIGA,
          team: "Club Atlético",
          position: Position.FORWARD,
        },
        { page: 2, limit: 10 },
      ),
    ).resolves.toMatchObject({
      data: [{ id: player.id, name: player.name }],
      total: 25,
    });
    expect(orderBy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
    );
  });

  it("returns null when a player id does not exist", async () => {
    await expect(
      new PlayerRepository(selectDatabase([])).findById(player.id),
    ).resolves.toBeNull();
  });
});
