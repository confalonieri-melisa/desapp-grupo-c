export type BatchProcess = "PLAYER_SYNC" | "QUOTE_RECALCULATION";
export type BatchOrigin = "SCHEDULED" | "MANUAL_API" | "MANUAL_CLI";
export type BatchStatus = "PENDING" | "RUNNING" | "COMPLETED" | "PARTIAL" | "FAILED";

export interface BatchScheduleConfig {
  process: BatchProcess;
  weekday: number;
  localTime: string;
  timezone: string;
}

export interface BatchOccurrence {
  scheduledLocal: string;
  scheduledFor: Date;
  timezone: string;
}

export interface BatchCounts {
  processed: number;
  succeeded: number;
  rejected: number;
}
