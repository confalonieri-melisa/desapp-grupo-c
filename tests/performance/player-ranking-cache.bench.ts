import { randomUUID } from "node:crypto";
import { inArray, eq } from "drizzle-orm";
import { closeDatabase, db } from "@/backend/db";
import { playerQuotes, players, valuationStrategyVersions } from "@/backend/db/schema";
import { env } from "@/backend/config/env";
import { League, Position } from "@/backend/models/enums";
import { BatchJobRepository } from "@/backend/repositories/batch-job.repository";
import { PlayerRankingRepository } from "@/backend/repositories/player-ranking.repository";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";
import { PlayerRankingCache } from "@/backend/services/player-ranking-cache";
import { PlayerRankingService } from "@/backend/services/player-ranking.service";

const databaseName = new URL(env.DATABASE_URL).pathname.slice(1);
if (!/(test|integration)/i.test(databaseName)) {
  throw new Error("The ranking benchmark requires an isolated test database");
}

const playerIds = Array.from({ length: 1000 }, () => randomUUID());
const versionId = randomUUID();
const rankingRepository = new PlayerRankingRepository();
const valuationRepository = new ValuationRepository();
const batchRepository = new BatchJobRepository();
const criteria = { page: 1, limit: 20 };
const CONCURRENT_REQUESTS = 20;

function median(samples: number[]): number {
  const sorted = [...samples].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function percentile95(samples: number[]): number {
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * 0.95) - 1];
}

async function measureConcurrent(service: PlayerRankingService, warm: boolean): Promise<number[]> {
  if (warm) await service.getRanking(criteria);
  return Promise.all(
    Array.from({ length: CONCURRENT_REQUESTS }, async () => {
      const startedAt = performance.now();
      await service.getRanking(criteria);
      return performance.now() - startedAt;
    }),
  );
}

async function insertFixtures(): Promise<void> {
  for (let start = 0; start < playerIds.length; start += 200) {
    await db.insert(players).values(
      playerIds.slice(start, start + 200).map((id, offset) => ({
        id,
        source: "RANKING_CACHE_BENCH",
        externalId: `ranking-cache-bench-${id}`,
        name: `Benchmark Player ${String(start + offset).padStart(4, "0")}`,
        team: "Benchmark FC",
        league: League.PREMIER_LEAGUE,
        position: Position.FORWARD,
        statistics: {},
      })),
    );
  }
  await db.insert(valuationStrategyVersions).values({
    id: versionId,
    strategyCode: "INDIVIDUAL_PERFORMANCE",
    version: `bench-${Date.now()}`,
    configuration: {},
    isActive: 1,
  });
  for (let start = 0; start < playerIds.length; start += 200) {
    await db.insert(playerQuotes).values(
      playerIds.slice(start, start + 200).map((playerId, offset) => {
        const score = (start + offset + 1) / 1001;
        return {
          playerId,
          strategyVersionId: versionId,
          individualScore: score.toFixed(6),
          finalScore: score.toFixed(6),
          quoteValue: (1 + score * 99).toFixed(2),
          explanation: {},
        };
      }),
    );
  }
}

async function cleanup(): Promise<void> {
  await db.delete(playerQuotes).where(eq(playerQuotes.strategyVersionId, versionId));
  await db.delete(valuationStrategyVersions).where(eq(valuationStrategyVersions.id, versionId));
  for (let start = 0; start < playerIds.length; start += 200) {
    await db.delete(players).where(inArray(players.id, playerIds.slice(start, start + 200)));
  }
}

async function main(): Promise<void> {
  try {
    await insertFixtures();
    const coldSamples: number[] = [];
    const warmSamples: number[] = [];
    for (let index = 0; index < 30; index++) {
      const service = new PlayerRankingService(
        rankingRepository,
        valuationRepository,
        batchRepository,
        new PlayerRankingCache(),
      );
      coldSamples.push(...(await measureConcurrent(service, false)));
    }
    for (let index = 0; index < 30; index++) {
      const service = new PlayerRankingService(
        rankingRepository,
        valuationRepository,
        batchRepository,
        new PlayerRankingCache(),
      );
      warmSamples.push(...(await measureConcurrent(service, true)));
    }
    const coldMedianMs = median(coldSamples);
    const warmMedianMs = median(warmSamples);
    const coldP95Ms = percentile95(coldSamples);
    const warmP95Ms = percentile95(warmSamples);
    const improvementPercent = ((coldMedianMs - warmMedianMs) / coldMedianMs) * 100;
    console.log(
      JSON.stringify(
        {
          players: playerIds.length,
          samplesPerGroup: coldSamples.length,
          concurrentRequests: CONCURRENT_REQUESTS,
          coldMedianMs,
          warmMedianMs,
          coldP95Ms,
          warmP95Ms,
          improvementPercent,
        },
        null,
        2,
      ),
    );
    if (improvementPercent < 25) throw new Error("SC-001 improvement below 25%");
    if (warmP95Ms > 200) throw new Error("Warm p95 SLA exceeded: expected <= 200 ms");
    if (coldP95Ms > 1000) throw new Error("Cold p95 SLA exceeded: expected <= 1000 ms");
  } finally {
    await cleanup();
    await closeDatabase();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
