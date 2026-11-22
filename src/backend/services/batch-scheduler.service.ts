import { Temporal } from "@js-temporal/polyfill";
import { env } from "@/backend/config/env";
import type { BatchOccurrence, BatchScheduleConfig } from "@/backend/models/batch-job";
import { BatchJobRepository, type BatchTurnRow } from "@/backend/repositories/batch-job.repository";

export interface ScheduledBatchRunner {
  runScheduled(turn: BatchTurnRow): Promise<boolean>;
}

export function occurrencesBetween(
  config: BatchScheduleConfig,
  after: Date,
  through: Date,
): BatchOccurrence[] {
  if (through <= after) return [];
  const start = Temporal.Instant.from(after.toISOString())
    .toZonedDateTimeISO(config.timezone)
    .toPlainDate();
  const end = Temporal.Instant.from(through.toISOString())
    .toZonedDateTimeISO(config.timezone)
    .toPlainDate();
  const [hour, minute] = config.localTime.split(":").map(Number);
  const occurrences: BatchOccurrence[] = [];
  for (let day = start; Temporal.PlainDate.compare(day, end) <= 0; day = day.add({ days: 1 })) {
    if (day.dayOfWeek !== config.weekday) continue;
    const local = day.toPlainDateTime({ hour, minute });
    const scheduledFor = new Date(
      Number(
        local.toZonedDateTime(config.timezone, { disambiguation: "compatible" }).toInstant()
          .epochMilliseconds,
      ),
    );
    if (scheduledFor > after && scheduledFor <= through) {
      occurrences.push({
        scheduledLocal: local.toString({ smallestUnit: "minute" }),
        scheduledFor,
        timezone: config.timezone,
      });
    }
  }
  return occurrences;
}

export function configuredBatchSchedules(): BatchScheduleConfig[] {
  return [
    {
      process: "PLAYER_SYNC",
      weekday: env.BATCH_SYNC_WEEKDAY,
      localTime: env.BATCH_SYNC_TIME,
      timezone: env.BATCH_SYNC_TIMEZONE,
    },
    {
      process: "QUOTE_RECALCULATION",
      weekday: env.BATCH_RECALC_WEEKDAY,
      localTime: env.BATCH_RECALC_TIME,
      timezone: env.BATCH_RECALC_TIMEZONE,
    },
  ];
}

export class BatchSchedulerService {
  private lastCheckedAt: Date;
  private initialized = false;

  constructor(
    private readonly configs: BatchScheduleConfig[],
    private readonly runner: ScheduledBatchRunner,
    private readonly repository = new BatchJobRepository(),
    startAt = new Date(),
  ) {
    this.lastCheckedAt = startAt;
  }

  async tick(now = new Date()): Promise<void> {
    if (!this.initialized) {
      const locked = await this.repository.withLock(async (session) => {
        await new BatchJobRepository(session).failAbandonedTurns();
      });
      this.initialized = locked.acquired;
    }
    for (const config of this.configs) {
      for (const occurrence of occurrencesBetween(config, this.lastCheckedAt, now)) {
        await this.repository.createScheduledTurn(config.process, occurrence);
      }
    }
    if (now > this.lastCheckedAt) this.lastCheckedAt = now;
    const pending = await this.repository.pendingScheduledTurns();
    pending.sort((a, b) =>
      a.process === b.process
        ? a.scheduledFor.getTime() - b.scheduledFor.getTime()
        : a.process === "PLAYER_SYNC"
          ? -1
          : 1,
    );
    for (const turn of pending) await this.runner.runScheduled(turn);
  }
}
