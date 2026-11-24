import { closeDatabase } from "@/backend/db";
import { BatchJobRepository } from "@/backend/repositories/batch-job.repository";
import { BatchExecutionService } from "@/backend/services/batch-execution.service";

async function main(): Promise<void> {
  const repository = new BatchJobRepository();
  const now = new Date();
  const turn = await repository.createScheduledTurn("QUOTE_RECALCULATION", {
    scheduledLocal: now.toISOString().slice(0, 19),
    scheduledFor: now,
    timezone: "UTC",
  });
  if (!turn) throw new Error("Scheduled turn already exists");
  if (!(await new BatchExecutionService().runScheduled(turn))) {
    throw new Error("Worker did not run the scheduled turn");
  }
  const finished = await repository.turnById(turn.id);
  process.stdout.write(`WORKER_${finished?.status}\n`);
  await closeDatabase();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
