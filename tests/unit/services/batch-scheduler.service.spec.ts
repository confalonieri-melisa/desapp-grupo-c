import { describe, expect, it } from "vitest";
import {
  configuredBatchSchedules,
  occurrencesBetween,
} from "@/backend/services/batch-scheduler.service";

describe("weekly batch schedule", () => {
  it("loads both weekly schedules from the environment", () => {
    expect(configuredBatchSchedules()).toEqual([
      {
        process: "PLAYER_SYNC",
        weekday: 2,
        localTime: "18:00",
        timezone: "America/Argentina/Buenos_Aires",
      },
      {
        process: "QUOTE_RECALCULATION",
        weekday: 2,
        localTime: "18:15",
        timezone: "America/Argentina/Buenos_Aires",
      },
    ]);
  });

  it("enumerates the configured weekday in local time", () => {
    const turns = occurrencesBetween(
      {
        process: "PLAYER_SYNC",
        weekday: 1,
        localTime: "02:00",
        timezone: "America/Argentina/Buenos_Aires",
      },
      new Date("2026-11-22T00:00:00Z"),
      new Date("2026-11-24T00:00:00Z"),
    );
    expect(turns).toEqual([
      {
        scheduledLocal: "2026-11-23T02:00",
        scheduledFor: new Date("2026-11-23T05:00:00Z"),
        timezone: "America/Argentina/Buenos_Aires",
      },
    ]);
  });

  it("uses the first occurrence of a repeated local hour", () => {
    const turns = occurrencesBetween(
      { process: "PLAYER_SYNC", weekday: 7, localTime: "01:30", timezone: "America/New_York" },
      new Date("2026-11-01T00:00:00Z"),
      new Date("2026-11-01T10:00:00Z"),
    );
    expect(turns).toEqual([
      {
        scheduledLocal: "2026-11-01T01:30",
        scheduledFor: new Date("2026-11-01T05:30:00Z"),
        timezone: "America/New_York",
      },
    ]);
  });

  it("shifts a nonexistent local hour by the daylight saving gap", () => {
    const turns = occurrencesBetween(
      {
        process: "QUOTE_RECALCULATION",
        weekday: 7,
        localTime: "02:30",
        timezone: "America/New_York",
      },
      new Date("2026-03-08T00:00:00Z"),
      new Date("2026-03-08T12:00:00Z"),
    );
    expect(turns).toEqual([
      {
        scheduledLocal: "2026-03-08T02:30",
        scheduledFor: new Date("2026-03-08T07:30:00Z"),
        timezone: "America/New_York",
      },
    ]);
  });
});
