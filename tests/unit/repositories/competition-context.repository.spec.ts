import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/backend/db";
import { CompetitionContextRepository } from "@/backend/repositories/competition-context.repository";
import { League } from "@/backend/models/enums";

const result = {
  league: League.PREMIER_LEAGUE,
  season: 2026,
  sourceData: { standings: [] },
  standings: [{
    league: League.PREMIER_LEAGUE,
    season: 2026,
    teamExternalId: "1",
    teamName: "Example",
    position: 1,
    playedGames: 1,
    points: 3,
    goalDifference: 2,
  }],
};

describe("CompetitionContextRepository", () => {
  it("creates an update and fails explicitly when no row is returned", async () => {
    const returning = vi.fn().mockResolvedValue([
      { id: "update-1", season: 2026, status: "RUNNING" },
    ]);
    const database = {
      insert: vi.fn(() => ({
        values: vi.fn(() => ({ returning })),
      })),
    } as unknown as Database;

    await expect(new CompetitionContextRepository(database).createUpdate(2026, "user-1"))
      .resolves.toMatchObject({ id: "update-1" });

    returning.mockResolvedValueOnce([]);
    await expect(new CompetitionContextRepository(database).createUpdate(2026))
      .rejects.toThrow("Context update could not be created");
  });

  it("persists the original source data and normalized standings atomically", async () => {
    const snapshotReturning = vi.fn().mockResolvedValue([{ id: "snapshot-1" }]);
    const insertedValues: unknown[] = [];
    const transaction = {
      insert: vi.fn(() => ({
        values: vi.fn((values: unknown) => {
          insertedValues.push(values);
          return Array.isArray(values)
            ? { onConflictDoNothing: vi.fn().mockResolvedValue(undefined) }
            : { returning: snapshotReturning };
        }),
      })),
    };
    const database = {
      transaction: vi.fn(async (callback: (tx: Database) => Promise<void>) =>
        callback(transaction as unknown as Database)),
    } as unknown as Database;

    await expect(new CompetitionContextRepository(database).persistResults("update-1", [result]))
      .resolves.toBeUndefined();

    expect(transaction.insert).toHaveBeenCalledTimes(2);
    expect(insertedValues[0]).toMatchObject({
      contextUpdateId: "update-1",
      league: League.PREMIER_LEAGUE,
      season: 2026,
      sourceData: result.sourceData,
    });
    expect(insertedValues[1]).toEqual([
      expect.objectContaining({
        contextUpdateId: "update-1",
        snapshotId: "snapshot-1",
        teamExternalId: "1",
      }),
    ]);
  });

  it("publishes valid updates and records their completion", async () => {
    const returning = vi.fn().mockResolvedValue([
      { id: "update-1", status: "VALID", publishedAt: new Date() },
    ]);
    const database = {
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({ returning })),
        })),
      })),
    } as unknown as Database;

    await expect(new CompetitionContextRepository(database).finishUpdate("update-1", "VALID"))
      .resolves.toMatchObject({ status: "VALID" });
    expect(database.update).toHaveBeenCalledTimes(1);
  });

  it("upserts confirmed team links idempotently", async () => {
    const values = vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    });
    const database = {
      transaction: vi.fn(async (callback: (tx: Database) => Promise<void>) =>
        callback({
          insert: vi.fn(() => ({ values })),
        } as unknown as Database)),
    } as unknown as Database;

    await new CompetitionContextRepository(database).saveConfirmedLinks([{
      league: League.PREMIER_LEAGUE,
      season: 2026,
      whoscoredTeamName: "Example",
      footballDataTeamExternalId: "fd-1",
      footballDataTeamName: "Example FC",
    }]);

    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      league: League.PREMIER_LEAGUE,
      season: 2026,
      whoscoredTeamName: "Example",
    }));
  });
});
