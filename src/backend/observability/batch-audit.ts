import type { BatchCounts } from "@/backend/models/batch-job";
import type { BatchTurnRow } from "@/backend/repositories/batch-job.repository";

export function recordBatchEvent(
  event: "batch.started" | "batch.finished",
  turn: BatchTurnRow,
  status: string = turn.status,
  counts?: BatchCounts,
  reasonCode?: string,
): void {
  console.info(
    JSON.stringify({
      event,
      process: turn.process,
      turnId: turn.id,
      correlationId: turn.correlationId,
      origin: turn.origin,
      scheduledLocal: turn.scheduledLocal,
      scheduledFor: turn.scheduledFor.toISOString(),
      startedAt: turn.startedAt?.toISOString(),
      finishedAt: event === "batch.finished" ? new Date().toISOString() : undefined,
      status,
      processedCount: counts?.processed,
      succeededCount: counts?.succeeded,
      rejectedCount: counts?.rejected,
      reasonCode,
    }),
  );
}
