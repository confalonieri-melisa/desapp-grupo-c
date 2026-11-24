import { once } from "node:events";
import { db, closeDatabase } from "@/backend/db";
import { playerQuotes } from "@/backend/db/schema";
import { BatchJobRepository } from "@/backend/repositories/batch-job.repository";

async function main(): Promise<void> {
  const playerId = process.env.RANKING_CACHE_PLAYER_ID;
  const strategyVersionId = process.env.RANKING_CACHE_VERSION_ID;
  if (!playerId || !strategyVersionId) throw new Error("Missing ranking fixture IDs");

  const repository = new BatchJobRepository();
  const now = new Date();
  const turn = await repository.createScheduledTurn("QUOTE_RECALCULATION", {
    scheduledLocal: now.toISOString().slice(0, 19),
    scheduledFor: now,
    timezone: "UTC",
  });
  if (!turn) throw new Error("Scheduled turn already exists");
  await repository.setTurnRunning(turn.id);

  await db.transaction(async (tx) => {
    await tx.insert(playerQuotes).values({
      playerId,
      strategyVersionId,
      individualScore: "0.990000",
      finalScore: "0.990000",
      quoteValue: "99.00",
      explanation: {},
      turnId: turn.id,
    });
    await repository.finishTurn(
      turn.id,
      "COMPLETED",
      { processed: 1, succeeded: 1, rejected: 0 },
      undefined,
      tx,
    );
    const resume = once(process.stdin, "data");
    process.stdout.write("RANKING_READY\n");
    await resume;
    process.stdin.pause();
  });
  await closeDatabase();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
