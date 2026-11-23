import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  repository: {
    createManualTurn: vi.fn(),
    withLock: vi.fn(),
    rejectManualTurn: vi.fn(),
    turnById: vi.fn(),
    setTurnRunning: vi.fn(),
    finishTurn: vi.fn(),
  },
  syncBatch: vi.fn(),
  recalculateBatch: vi.fn(),
  recordBatchEvent: vi.fn(),
}));

vi.mock("@/backend/repositories/batch-job.repository", () => ({
  BatchJobRepository: class {
    createManualTurn = mocks.repository.createManualTurn;
    withLock = mocks.repository.withLock;
    rejectManualTurn = mocks.repository.rejectManualTurn;
    turnById = mocks.repository.turnById;
    setTurnRunning = mocks.repository.setTurnRunning;
    finishTurn = mocks.repository.finishTurn;
  },
}));
vi.mock("@/backend/services/player-sync.service", () => ({
  PlayerSyncService: class {
    syncBatch = mocks.syncBatch;
  },
}));
vi.mock("@/backend/services/quote-recalculation.service", () => ({
  QuoteRecalculationService: class {
    recalculateBatch = mocks.recalculateBatch;
  },
}));
vi.mock("@/backend/observability/batch-audit", () => ({
  recordBatchEvent: mocks.recordBatchEvent,
}));

import { ConflictError } from "@/backend/errors/http.error";
import { BatchExecutionService } from "@/backend/services/batch-execution.service";

const turn = {
  id: "turn-1",
  process: "PLAYER_SYNC",
  origin: "MANUAL_CLI",
  correlationId: "correlation-1",
  status: "PENDING",
  scheduledLocal: "2026-11-24T18:00",
  scheduledFor: new Date("2026-11-24T21:00:00.000Z"),
  startedAt: new Date("2026-11-24T21:00:01.000Z"),
  finishedAt: null,
  timezone: "America/Argentina/Buenos_Aires",
};

describe("BatchExecutionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.repository.createManualTurn.mockResolvedValue(turn);
    mocks.repository.withLock.mockImplementation(async (action) => ({
      acquired: true,
      value: await action({}),
    }));
    mocks.repository.turnById.mockResolvedValue({ ...turn, status: "PENDING" });
    mocks.repository.setTurnRunning.mockResolvedValue({ ...turn, status: "RUNNING" });
    mocks.syncBatch.mockResolvedValue({ processed: 2, succeeded: 2, rejected: 0 });
    mocks.recalculateBatch.mockResolvedValue({
      status: "PARTIAL",
      calculated: 2,
      rejected: 1,
      quotes: [],
      errors: [],
    });
  });

  it("runs manual sync under the lock and returns its turn metadata", async () => {
    const service = new BatchExecutionService(undefined, () => ({
      source: "WHOSCORED",
      fetchPlayers: vi.fn(),
    }));
    await expect(service.runManualSync("correlation-1")).resolves.toMatchObject({
      status: "COMPLETED",
      processed: 2,
      succeeded: 2,
      turnId: "turn-1",
      correlationId: "correlation-1",
    });
    expect(mocks.repository.createManualTurn).toHaveBeenCalledWith(
      "PLAYER_SYNC",
      "MANUAL_CLI",
      "correlation-1",
    );
    expect(mocks.recordBatchEvent).toHaveBeenCalledTimes(2);
  });

  it("preserves the recalculation response for the manual API", async () => {
    const service = new BatchExecutionService();
    await expect(service.runManualRecalculation("api-correlation")).resolves.toMatchObject({
      status: "PARTIAL",
      calculated: 2,
      rejected: 1,
    });
    expect(mocks.repository.createManualTurn).toHaveBeenCalledWith(
      "QUOTE_RECALCULATION",
      "MANUAL_API",
      "api-correlation",
    );
    expect(mocks.recalculateBatch).toHaveBeenCalledWith("turn-1", expect.anything());
    expect(mocks.recordBatchEvent).toHaveBeenLastCalledWith(
      "batch.finished",
      expect.anything(),
      "PARTIAL",
      { processed: 3, succeeded: 2, rejected: 1 },
    );
  });

  it("rejects a manual run when another batch owns the lock", async () => {
    mocks.repository.withLock.mockResolvedValue({ acquired: false });
    const service = new BatchExecutionService();
    await expect(service.runManualSync()).rejects.toBeInstanceOf(ConflictError);
    expect(mocks.repository.rejectManualTurn).toHaveBeenCalledWith("turn-1");
    expect(mocks.syncBatch).not.toHaveBeenCalled();
  });

  it("skips a scheduled turn that is no longer pending", async () => {
    mocks.repository.turnById.mockResolvedValue({ ...turn, status: "COMPLETED" });
    const service = new BatchExecutionService();
    await expect(service.runScheduled(turn as never)).resolves.toBe(false);
    expect(mocks.repository.setTurnRunning).not.toHaveBeenCalled();
  });

  it("marks a failed batch before propagating its error", async () => {
    mocks.syncBatch.mockRejectedValue(new Error("source unavailable"));
    const service = new BatchExecutionService(undefined, () => ({
      source: "WHOSCORED",
      fetchPlayers: vi.fn(),
    }));
    await expect(service.runManualSync()).rejects.toThrow("source unavailable");
    expect(mocks.repository.finishTurn).toHaveBeenCalledWith(
      "turn-1",
      "FAILED",
      { processed: 0, succeeded: 0, rejected: 0 },
      "BATCH_FAILED",
    );
    expect(mocks.recordBatchEvent).toHaveBeenLastCalledWith(
      "batch.finished",
      expect.anything(),
      "FAILED",
      expect.anything(),
      "BATCH_FAILED",
    );
  });
});
