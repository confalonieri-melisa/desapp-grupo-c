import { afterAll, afterEach, describe, expect, it } from "vitest";
import { closeDatabase, db } from "@/backend/db";
import {
  batchTurns,
  playerQuotes,
  players,
  tokenHoldings,
  users,
  valuationStrategyVersions,
} from "@/backend/db/schema";
import { BatchJobRepository } from "@/backend/repositories/batch-job.repository";
import { BatchSchedulerService } from "@/backend/services/batch-scheduler.service";
import { BatchExecutionService } from "@/backend/services/batch-execution.service";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";
import { buildValuationConfig } from "@/backend/services/valuation-strategy.service";
import { League, Position, UserRole } from "@/backend/models/enums";

const player = {
  externalId: "basic-batch-player",
  name: "Batch Player",
  team: "Test FC",
  league: League.PREMIER_LEAGUE,
  position: Position.FORWARD,
  statistics: { rating: 7, minutesPlayed: 1800, appearances: 20, goals: 8, assists: 3 },
};

describe.skipIf(process.env.RUN_DB_INTEGRATION_TESTS !== "true")("basic batch scheduling", () => {
  afterEach(async () => {
    await db.delete(playerQuotes);
    await db.delete(batchTurns);
    await db.delete(tokenHoldings);
    await db.delete(valuationStrategyVersions);
    await db.delete(players);
    await db.delete(users);
  });
  afterAll(closeDatabase);

  it("creates one scheduled turn per process across two workers", async () => {
    const configs = [
      {
        process: "PLAYER_SYNC" as const,
        weekday: 1,
        localTime: "02:00",
        timezone: "America/Argentina/Buenos_Aires",
      },
      {
        process: "QUOTE_RECALCULATION" as const,
        weekday: 1,
        localTime: "02:00",
        timezone: "America/Argentina/Buenos_Aires",
      },
    ];
    const started: string[] = [];
    const runner = {
      runScheduled: async (turn: { id: string; process: string }) => {
        const locked = await new BatchJobRepository().withLock(async (session) => {
          const repo = new BatchJobRepository(session);
          if (!(await repo.setTurnRunning(turn.id))) return false;
          started.push(turn.process);
          await repo.finishTurn(turn.id, "COMPLETED", { processed: 0, succeeded: 0, rejected: 0 });
          return true;
        });
        return locked.acquired ? locked.value : false;
      },
    };
    const before = new Date("2026-11-23T04:59:55Z");
    const first = new BatchSchedulerService(configs, runner, new BatchJobRepository(), before);
    const second = new BatchSchedulerService(configs, runner, new BatchJobRepository(), before);
    await Promise.all([
      first.tick(new Date("2026-11-23T05:00:10Z")),
      second.tick(new Date("2026-11-23T05:00:10Z")),
    ]);
    expect(await db.select().from(batchTurns)).toHaveLength(2);
    expect(started).toEqual(["PLAYER_SYNC", "QUOTE_RECALCULATION"]);
  });

  it("runs both manual paths and stores complete results", async () => {
    const ownerId = "00000000-0000-0000-0000-000000000302";
    await db.insert(users).values({
      id: ownerId,
      email: "basic-batch@example.com",
      password: "secret",
      name: "Batch Owner",
      role: UserRole.SUPERUSER,
    });
    await new ValuationRepository().activateStrategyVersion(
      "INDIVIDUAL_PERFORMANCE",
      "1.0.0",
      buildValuationConfig("INDIVIDUAL_PERFORMANCE"),
      ownerId,
    );
    const execution = new BatchExecutionService(new BatchJobRepository(), () => ({
      source: "WHOSCORED",
      fetchPlayers: async () => [player],
    }));
    const synced = await execution.runManualSync("sync-correlation");
    const quoted = await execution.runManualRecalculation("quote-correlation");
    expect(synced).toMatchObject({
      status: "COMPLETED",
      succeeded: 1,
      correlationId: "sync-correlation",
    });
    expect(quoted).toMatchObject({
      status: "COMPLETED",
      calculated: 1,
    });
    expect(
      (await db.select().from(batchTurns)).find((turn) => turn.process === "QUOTE_RECALCULATION")
        ?.correlationId,
    ).toBe("quote-correlation");
    expect(await db.select().from(playerQuotes)).toHaveLength(1);
    expect(await db.select().from(tokenHoldings)).toHaveLength(1);
    expect((await db.select().from(batchTurns)).map((turn) => turn.status)).toEqual([
      "COMPLETED",
      "COMPLETED",
    ]);
  });

  it("retries a failed source once and keeps local players available for recalculation", async () => {
    const ownerId = "00000000-0000-0000-0000-000000000303";
    await db.insert(users).values({
      id: ownerId,
      email: "basic-fallback@example.com",
      password: "secret",
      name: "Fallback Owner",
      role: UserRole.SUPERUSER,
    });
    await new ValuationRepository().activateStrategyVersion(
      "INDIVIDUAL_PERFORMANCE",
      "1.0.0",
      buildValuationConfig("INDIVIDUAL_PERFORMANCE"),
      ownerId,
    );
    await new BatchExecutionService(new BatchJobRepository(), () => ({
      source: "WHOSCORED",
      fetchPlayers: async () => [player],
    })).runManualSync();
    let calls = 0;
    const execution = new BatchExecutionService(new BatchJobRepository(), () => ({
      source: "WHOSCORED",
      fetchPlayers: async () => {
        calls += 1;
        throw new Error("provider unavailable");
      },
    }));
    await expect(execution.runManualSync()).rejects.toThrow("provider unavailable");
    expect(calls).toBe(2);
    expect(await db.select().from(players)).toHaveLength(1);
    expect(await execution.runManualRecalculation()).toMatchObject({
      status: "COMPLETED",
      calculated: 1,
    });
    expect((await db.select().from(batchTurns)).map((turn) => turn.status)).toEqual([
      "COMPLETED",
      "FAILED",
      "COMPLETED",
    ]);
  });
});
