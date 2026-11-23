import { afterAll, afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDatabase, db } from "@/backend/db";
import { batchTurns, players } from "@/backend/db/schema";
import { League, Position } from "@/backend/models/enums";
import { Player } from "@/backend/models/Player";
import { BatchJobRepository } from "@/backend/repositories/batch-job.repository";
import { PlayerRepository } from "@/backend/repositories/player.repository";

const repository = new BatchJobRepository();

describe.skipIf(process.env.RUN_DB_INTEGRATION_TESTS !== "true")("basic batch repository", () => {
  afterEach(async () => {
    await db.delete(batchTurns);
    await db.delete(players).where(eq(players.externalId, "rollback-player"));
  });
  afterAll(closeDatabase);

  it("creates one turn for the same process and scheduled instant", async () => {
    const occurrence = {
      scheduledLocal: "2026-11-23T02:00",
      scheduledFor: new Date("2026-11-23T05:00:00Z"),
      timezone: "America/Argentina/Buenos_Aires",
    };
    expect(await repository.createScheduledTurn("PLAYER_SYNC", occurrence)).not.toBeNull();
    expect(await repository.createScheduledTurn("PLAYER_SYNC", occurrence)).toBeNull();
    expect(await db.select().from(batchTurns)).toHaveLength(1);
  });

  it("excludes a second process while the global lock is held", async () => {
    const result = await repository.withLock(async () => {
      expect((await new BatchJobRepository().withLock(async () => "unexpected")).acquired).toBe(
        false,
      );
      return "owner";
    });
    expect(result).toEqual({ acquired: true, value: "owner" });
    expect((await repository.withLock(async () => "next")).acquired).toBe(true);
  });

  it("rolls back a player write and the run result together", async () => {
    const turn = await repository.createManualTurn("PLAYER_SYNC", "MANUAL_CLI");
    await repository.withLock(async (session) => {
      const batch = new BatchJobRepository(session);
      expect(await batch.setTurnRunning(turn.id)).not.toBeNull();
      await expect(
        session.transaction(async (tx) => {
          await new PlayerRepository(session).savePlayerInTransaction(
            {
              player: new Player({
                name: "Rollback",
                team: "Test FC",
                league: League.PREMIER_LEAGUE,
                position: Position.FORWARD,
                statistics: { rating: 7 },
              }),
              source: "WHOSCORED",
              externalId: "rollback-player",
            },
            tx,
          );
          await batch.finishTurn(
            turn.id,
            "COMPLETED",
            { processed: 1, succeeded: 1, rejected: 0 },
            undefined,
            tx,
          );
          throw new Error("abort run transaction");
        }),
      ).rejects.toThrow("abort run transaction");
    });
    expect(
      await db.select().from(players).where(eq(players.externalId, "rollback-player")),
    ).toHaveLength(0);
    expect((await repository.turnById(turn.id))?.status).toBe("RUNNING");
  });

  it("marks abandoned running turns as failed after taking the lock", async () => {
    const turn = await repository.createManualTurn("QUOTE_RECALCULATION", "MANUAL_API");
    await repository.setTurnRunning(turn.id);
    await repository.withLock(async (session) =>
      new BatchJobRepository(session).failAbandonedTurns(),
    );
    expect(await repository.turnById(turn.id)).toMatchObject({
      status: "FAILED",
      reasonCode: "INTERRUPTED",
    });
  });
});
