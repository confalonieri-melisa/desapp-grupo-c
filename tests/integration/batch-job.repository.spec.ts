import { afterAll, afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDatabase, db } from "@/backend/db";
import { batchTurns, playerQuotes, players, valuationStrategyVersions } from "@/backend/db/schema";
import { League, Position } from "@/backend/models/enums";
import { Player } from "@/backend/models/Player";
import { BatchJobRepository } from "@/backend/repositories/batch-job.repository";
import { PlayerRepository } from "@/backend/repositories/player.repository";

const repository = new BatchJobRepository();
const revisionPlayerId = "00000000-0000-4000-8000-000000000821";
const revisionVersionId = "00000000-0000-4000-8000-000000000822";

describe.skipIf(process.env.RUN_DB_INTEGRATION_TESTS !== "true")("basic batch repository", () => {
  afterEach(async () => {
    await db.delete(playerQuotes).where(eq(playerQuotes.playerId, revisionPlayerId));
    await db.delete(batchTurns);
    await db.delete(players).where(eq(players.externalId, "rollback-player"));
    await db
      .delete(valuationStrategyVersions)
      .where(eq(valuationStrategyVersions.id, revisionVersionId));
    await db.delete(players).where(eq(players.id, revisionPlayerId));
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

  it("counts confirmed quote and player sync turns that affect the ranking", async () => {
    const cases = [
      { process: "QUOTE_RECALCULATION", status: "COMPLETED", succeededCount: 2 },
      { process: "QUOTE_RECALCULATION", status: "PARTIAL", succeededCount: 1 },
      { process: "QUOTE_RECALCULATION", status: "FAILED", succeededCount: 1 },
      { process: "QUOTE_RECALCULATION", status: "COMPLETED", succeededCount: 0 },
      { process: "PLAYER_SYNC", status: "COMPLETED", succeededCount: 1 },
      { process: "PLAYER_SYNC", status: "FAILED", succeededCount: 1 },
      { process: "PLAYER_SYNC", status: "COMPLETED", succeededCount: 0 },
    ];
    for (const [index, item] of cases.entries()) {
      await db.insert(batchTurns).values({
        ...item,
        origin: "MANUAL_CLI",
        scheduledLocal: `2026-11-23T12:00:${String(index).padStart(2, "0")}`,
        scheduledFor: new Date(`2026-11-23T12:00:${String(index).padStart(2, "0")}Z`),
        timezone: "UTC",
        correlationId: `ranking-revision-${index}`,
      });
    }
    expect(await repository.getRankingPublicationRevision()).toBe(3);
  });

  it("exposes a finished turn only after its transaction commits", async () => {
    await db.insert(players).values({
      id: revisionPlayerId,
      source: "RANKING_CACHE_TEST",
      externalId: "revision-player",
      name: "Revision Player",
      team: "Example FC",
      league: League.PREMIER_LEAGUE,
      position: Position.FORWARD,
      statistics: {},
    });
    await db.insert(valuationStrategyVersions).values({
      id: revisionVersionId,
      strategyCode: "INDIVIDUAL_PERFORMANCE",
      version: "ranking-revision-test",
      configuration: {},
      isActive: 0,
    });
    const turn = await repository.createManualTurn("QUOTE_RECALCULATION", "MANUAL_CLI");
    await repository.setTurnRunning(turn.id);
    let release!: () => void;
    let ready!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const inserted = new Promise<void>((resolve) => {
      ready = resolve;
    });
    const before = await repository.getRankingPublicationRevision();
    const transaction = db.transaction(async (tx) => {
      await tx.insert(playerQuotes).values({
        playerId: revisionPlayerId,
        strategyVersionId: revisionVersionId,
        individualScore: "0.900000",
        finalScore: "0.900000",
        quoteValue: "90.00",
        explanation: {},
        turnId: turn.id,
      });
      await new BatchJobRepository(tx as never).finishTurn(
        turn.id,
        "COMPLETED",
        { processed: 1, succeeded: 1, rejected: 0 },
        undefined,
        tx,
      );
      ready();
      await held;
    });
    await inserted;
    expect(await repository.getRankingPublicationRevision()).toBe(before);
    expect(
      await db.select().from(playerQuotes).where(eq(playerQuotes.playerId, revisionPlayerId)),
    ).toHaveLength(0);
    release();
    await transaction;
    expect(await repository.getRankingPublicationRevision()).toBe(before + 1);
    expect(
      await db.select().from(playerQuotes).where(eq(playerQuotes.playerId, revisionPlayerId)),
    ).toHaveLength(1);
  });
});
