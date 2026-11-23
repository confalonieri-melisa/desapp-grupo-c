import { afterEach, describe, expect, it, vi } from "vitest";
import { recordBatchEvent } from "@/backend/observability/batch-audit";

describe("batch audit events", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes turn metadata and counts as structured JSON", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    recordBatchEvent(
      "batch.finished",
      {
        id: "turn-1",
        process: "QUOTE_RECALCULATION",
        origin: "SCHEDULED",
        status: "PARTIAL",
        correlationId: "corr-1",
        scheduledLocal: "2026-11-24T18:15",
        scheduledFor: new Date("2026-11-24T21:15:00.000Z"),
        startedAt: new Date("2026-11-24T21:15:02.000Z"),
        finishedAt: new Date("2026-11-24T21:15:05.000Z"),
      } as never,
      "PARTIAL",
      { processed: 4, succeeded: 3, rejected: 1 },
      "PLAYER_REJECTED",
    );

    const event = JSON.parse(info.mock.calls[0][0] as string);
    expect(event).toMatchObject({
      event: "batch.finished",
      process: "QUOTE_RECALCULATION",
      turnId: "turn-1",
      correlationId: "corr-1",
      scheduledFor: "2026-11-24T21:15:00.000Z",
      status: "PARTIAL",
      processedCount: 4,
      succeededCount: 3,
      rejectedCount: 1,
      reasonCode: "PLAYER_REJECTED",
    });
    expect(event.finishedAt).toBeTruthy();
  });

  it("omits missing counts and uses the turn status by default", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    recordBatchEvent("batch.started", {
      id: "turn-2",
      process: "PLAYER_SYNC",
      origin: "MANUAL_CLI",
      status: "RUNNING",
      correlationId: "corr-2",
      scheduledLocal: "2026-11-24T18:00",
      scheduledFor: new Date("2026-11-24T21:00:00.000Z"),
    } as never);

    const event = JSON.parse(info.mock.calls[0][0] as string);
    expect(event.status).toBe("RUNNING");
    expect(event.finishedAt).toBeUndefined();
    expect(event.processedCount).toBeUndefined();
  });
});
