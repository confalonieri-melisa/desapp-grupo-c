import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { promisify } from "node:util";
import { and, eq } from "drizzle-orm";
import { closeDatabase, db, type Database } from "@/backend/db";
import { batchTurns, playerQuotes, players, valuationStrategyVersions } from "@/backend/db/schema";
import { League, Position } from "@/backend/models/enums";
import { BatchJobRepository } from "@/backend/repositories/batch-job.repository";
import { PlayerRankingRepository } from "@/backend/repositories/player-ranking.repository";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";
import { PlayerRankingCache } from "@/backend/services/player-ranking-cache";
import { PlayerRankingService } from "@/backend/services/player-ranking.service";

const activeVersionId = "00000000-0000-4000-8000-000000000701";
const inactiveVersionId = "00000000-0000-4000-8000-000000000702";
const playerOneId = "00000000-0000-4000-8000-000000000703";
const playerTwoId = "00000000-0000-4000-8000-000000000704";
const playerThreeId = "00000000-0000-4000-8000-000000000705";
const playerFourId = "00000000-0000-4000-8000-000000000711";
const quoteIds = [
  "00000000-0000-4000-8000-000000000706",
  "00000000-0000-4000-8000-000000000707",
  "00000000-0000-4000-8000-000000000708",
  "00000000-0000-4000-8000-000000000709",
  "00000000-0000-4000-8000-000000000710",
];
const repository = new PlayerRankingRepository();

describe.skipIf(process.env.RUN_DB_INTEGRATION_TESTS !== "true")("PlayerRankingRepository", () => {
  let previousActiveIds: string[] = [];

  beforeAll(async () => {
    const activeRows = await db
      .select({ id: valuationStrategyVersions.id })
      .from(valuationStrategyVersions)
      .where(eq(valuationStrategyVersions.isActive, 1));
    previousActiveIds = activeRows.map((row) => row.id);
    await db.update(valuationStrategyVersions).set({ isActive: 0, activatedAt: null });
  });

  afterEach(async () => {
    await db.delete(playerQuotes).where(eq(playerQuotes.playerId, playerOneId));
    await db.delete(playerQuotes).where(eq(playerQuotes.playerId, playerTwoId));
    await db.delete(playerQuotes).where(eq(playerQuotes.playerId, playerThreeId));
    await db.delete(playerQuotes).where(eq(playerQuotes.playerId, playerFourId));
    await db.delete(batchTurns).where(eq(batchTurns.process, "QUOTE_RECALCULATION"));
    await db
      .delete(valuationStrategyVersions)
      .where(and(eq(valuationStrategyVersions.id, activeVersionId)));
    await db
      .delete(valuationStrategyVersions)
      .where(and(eq(valuationStrategyVersions.id, inactiveVersionId)));
    await db.delete(players).where(eq(players.id, playerOneId));
    await db.delete(players).where(eq(players.id, playerTwoId));
    await db.delete(players).where(eq(players.id, playerThreeId));
    await db.delete(players).where(eq(players.id, playerFourId));
  });

  afterAll(async () => {
    for (const id of previousActiveIds) {
      await db
        .update(valuationStrategyVersions)
        .set({ isActive: 1, activatedAt: new Date() })
        .where(eq(valuationStrategyVersions.id, id));
    }
    await closeDatabase();
  });

  it("ranks latest quotes from the active version and applies filters/pagination", async () => {
    await db.insert(players).values([
      {
        id: playerOneId,
        source: "RANKING_TEST",
        externalId: "ranking-one",
        name: "Alpha Player",
        team: "Example FC",
        league: League.PREMIER_LEAGUE,
        position: Position.FORWARD,
        statistics: {},
      },
      {
        id: playerTwoId,
        source: "RANKING_TEST",
        externalId: "ranking-two",
        name: "Beta Player",
        team: "Example FC",
        league: League.PREMIER_LEAGUE,
        position: Position.DEFENDER,
        statistics: {},
      },
      {
        id: playerThreeId,
        source: "RANKING_TEST",
        externalId: "ranking-three",
        name: "Gamma Player",
        team: "Other FC",
        league: League.BUNDESLIGA,
        position: Position.FORWARD,
        statistics: {},
      },
      {
        id: playerFourId,
        source: "RANKING_TEST",
        externalId: "ranking-four",
        name: "Delta Player",
        team: "Example FC",
        league: League.PREMIER_LEAGUE,
        position: Position.FORWARD,
        statistics: {},
      },
    ]);
    await db.insert(valuationStrategyVersions).values([
      {
        id: activeVersionId,
        strategyCode: "INDIVIDUAL_PERFORMANCE",
        version: "ranking-active",
        configuration: {},
        isActive: 1,
      },
      {
        id: inactiveVersionId,
        strategyCode: "INDIVIDUAL_PERFORMANCE",
        version: "ranking-inactive",
        configuration: {},
        isActive: 0,
      },
    ]);
    await db.insert(playerQuotes).values([
      {
        id: quoteIds[0],
        playerId: playerOneId,
        strategyVersionId: activeVersionId,
        individualScore: "0.400000",
        finalScore: "0.400000",
        quoteValue: "40.60",
        explanation: {},
        calculatedAt: new Date("2026-10-20T10:00:00.000Z"),
      },
      {
        id: quoteIds[1],
        playerId: playerOneId,
        strategyVersionId: activeVersionId,
        individualScore: "0.900000",
        finalScore: "0.900000",
        quoteValue: "90.10",
        explanation: {},
        calculatedAt: new Date("2026-10-21T10:00:00.000Z"),
      },
      {
        id: quoteIds[2],
        playerId: playerTwoId,
        strategyVersionId: activeVersionId,
        individualScore: "0.800000",
        finalScore: "0.800000",
        quoteValue: "80.10",
        explanation: {},
        calculatedAt: new Date("2026-10-21T10:00:00.000Z"),
      },
      {
        id: quoteIds[3],
        playerId: playerThreeId,
        strategyVersionId: activeVersionId,
        individualScore: "0.700000",
        finalScore: "0.700000",
        quoteValue: "70.10",
        explanation: {},
        calculatedAt: new Date("2026-10-21T10:00:00.000Z"),
      },
      {
        id: quoteIds[4],
        playerId: playerOneId,
        strategyVersionId: inactiveVersionId,
        individualScore: "0.100000",
        finalScore: "0.100000",
        quoteValue: "10.10",
        explanation: {},
        calculatedAt: new Date("2026-10-22T10:00:00.000Z"),
      },
    ]);

    const result = await repository.findRankedPlayers(activeVersionId, {
      team: "example",
      page: 1,
      limit: 10,
    });

    expect(result.total).toBe(2);
    expect(result.rows.map((row) => row.playerId)).toEqual([playerOneId, playerTwoId]);
    expect(result.rows[0]?.finalScore).toBe(0.9);
    expect(result.rows[0]?.quoteValue).toBe(90.1);

    let reads = 0;
    const interleavedDatabase = {
      transaction: (
        run: (tx: Database) => Promise<unknown>,
        options: { isolationLevel: "repeatable read"; accessMode: "read only" },
      ) =>
        db.transaction(
          async (tx) =>
            run({
              execute: async (query: Parameters<typeof tx.execute>[0]) => {
                const value = await tx.execute(query);
                if (++reads === 1) {
                  await db.insert(playerQuotes).values({
                    id: "00000000-0000-4000-8000-000000000712",
                    playerId: playerFourId,
                    strategyVersionId: activeVersionId,
                    individualScore: "0.950000",
                    finalScore: "0.950000",
                    quoteValue: "95.00",
                    explanation: {},
                  });
                }
                return value;
              },
            } as Database),
          options,
        ),
    } as unknown as Database;
    const snapshot = await new PlayerRankingRepository(interleavedDatabase).findRankedPlayers(
      activeVersionId,
      { team: "example", page: 1, limit: 10 },
    );
    expect(snapshot.rows.map((row) => row.playerId)).toEqual([playerOneId, playerTwoId]);
    expect(snapshot.total).toBe(2);
    expect(
      (await repository.findRankedPlayers(activeVersionId, { team: "example", page: 1, limit: 10 }))
        .total,
    ).toBe(3);

    const service = new PlayerRankingService(
      repository,
      new ValuationRepository(),
      new BatchJobRepository(),
      new PlayerRankingCache(),
    );
    const criteria = { team: "example", page: 1, limit: 10 };
    const warm = await service.getRanking(criteria);
    expect(warm.players[0].quoteValue).toBe(95);

    const child = spawn(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "tests/fixtures/publish-ranking-quote.ts"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          RANKING_CACHE_PLAYER_ID: playerOneId,
          RANKING_CACHE_VERSION_ID: activeVersionId,
        },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let output = "";
    let errorOutput = "";
    child.stderr.on("data", (chunk: Buffer) => {
      errorOutput += chunk.toString();
    });
    await new Promise<void>((resolve, reject) => {
      child.stdout.on("data", (chunk: Buffer) => {
        output += chunk.toString();
        if (output.includes("RANKING_READY")) resolve();
      });
      child.once("error", reject);
      child.once("exit", (code) => {
        if (!output.includes("RANKING_READY"))
          reject(new Error(`publisher exited ${code}: ${errorOutput}`));
      });
    });
    const beforeCommit = await service.getRanking(criteria);
    expect(beforeCommit).toBe(warm);
    const exit = once(child, "exit");
    child.stdin.write("commit\n");
    expect((await exit)[0]).toBe(0);
    const fresh = await service.getRanking(criteria);
    expect(fresh.players[0]).toMatchObject({ player: { id: playerOneId }, quoteValue: 99 });
    expect(fresh).not.toBe(warm);
    expect(await service.getRanking(criteria)).toBe(fresh);
  }, 30_000);

  it("refreshes an empty cached ranking after the real scheduled worker publishes a quote", async () => {
    await db.insert(players).values({
      id: playerOneId,
      source: "RANKING_TEST",
      externalId: "ranking-one",
      name: "Alpha Player",
      team: "Example FC",
      league: League.PREMIER_LEAGUE,
      position: Position.FORWARD,
      statistics: { rating: 8 },
    });
    await db.insert(valuationStrategyVersions).values({
      id: activeVersionId,
      strategyCode: "INDIVIDUAL_PERFORMANCE",
      version: "worker-test",
      configuration: {
        individualMetrics: [
          {
            metric: "rating",
            polarity: "POSITIVE",
            weight: 1,
            minimum: 0,
            maximum: 10,
          },
        ],
        teamMetrics: [],
        individualShare: 1,
        teamShare: 0,
        missingContextPolicy: "INDIVIDUAL_ONLY",
        quoteFormula: "LINEAR_1_99",
        precision: 2,
      },
      isActive: 1,
    });
    const service = new PlayerRankingService(
      repository,
      new ValuationRepository(),
      new BatchJobRepository(),
      new PlayerRankingCache(),
    );
    const criteria = { page: 1, limit: 20 };
    expect((await service.getRanking(criteria)).players).toEqual([]);
    const { stdout } = await promisify(execFile)(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "tests/fixtures/run-ranking-worker.ts"],
      { cwd: process.cwd(), env: process.env },
    );
    expect(stdout).toContain("WORKER_COMPLETED");
    const fresh = await service.getRanking(criteria);
    expect(fresh.players[0]).toMatchObject({ player: { id: playerOneId }, quoteValue: 80.2 });
    expect(await service.getRanking(criteria)).toBe(fresh);
  }, 30_000);
});
