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

function median(samples: number[]): number {
  const sorted = [...samples].sort((left, right) => left - right);
  return (sorted[14] + sorted[15]) / 2;
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
      const startedAt = performance.now();
      await service.getRanking(criteria);
      coldSamples.push(performance.now() - startedAt);
    }
    for (let index = 0; index < 30; index++) {
      const service = new PlayerRankingService(
        rankingRepository,
        valuationRepository,
        batchRepository,
        new PlayerRankingCache(),
      );
      await service.getRanking(criteria);
      const startedAt = performance.now();
      await service.getRanking(criteria);
      warmSamples.push(performance.now() - startedAt);
    }
    const coldMedianMs = median(coldSamples);
    const warmMedianMs = median(warmSamples);
    const improvementPercent = ((coldMedianMs - warmMedianMs) / coldMedianMs) * 100;
    console.log(
      JSON.stringify(
        {
          players: playerIds.length,
          samplesPerGroup: 30,
          coldMedianMs,
          warmMedianMs,
          improvementPercent,
        },
        null,
        2,
      ),
    );
    if (improvementPercent < 25) throw new Error("SC-001 improvement below 25%");
  } finally {
    await cleanup();
    await closeDatabase();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
