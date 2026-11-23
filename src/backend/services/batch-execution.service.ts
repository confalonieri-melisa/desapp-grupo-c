import { randomUUID } from "node:crypto";
import { env } from "@/backend/config/env";
import type { Database } from "@/backend/db";
import { ConflictError } from "@/backend/errors/http.error";
import type { BatchCounts } from "@/backend/models/batch-job";
import { recordBatchEvent } from "@/backend/observability/batch-audit";
import { BatchJobRepository, type BatchTurnRow } from "@/backend/repositories/batch-job.repository";
import { PlayerRepository } from "@/backend/repositories/player.repository";
import { MarketRepository } from "@/backend/repositories/market.repository";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";
import { CompetitionContextRepository } from "@/backend/repositories/competition-context.repository";
import { WhoScoredAdapter } from "@/backend/adapters/whoscored.adapter";
import { WhoScoredScraper } from "@/backend/adapters/whoscored.scraper";
import type { PlayerDataSource } from "@/backend/adapters/player-data-source";
import { PlayerSyncService } from "@/backend/services/player-sync.service";
import { QuoteRecalculationService } from "@/backend/services/quote-recalculation.service";

function whoScoredSource(): PlayerDataSource {
  const scraper = new WhoScoredScraper({
    pythonPath: env.WHOSCORED_PYTHON_PATH,
    scriptPath: env.WHOSCORED_SCRIPT_PATH,
    url: env.WHOSCORED_URL,
    maxPages: env.WHOSCORED_MAX_PAGES,
    limit: env.WHOSCORED_LIMIT,
    headless: env.WHOSCORED_HEADLESS,
  });
  return new WhoScoredAdapter(() => scraper.fetchPlayers());
}

type RunResult = { status: "COMPLETED" | "PARTIAL" | "FAILED"; counts: BatchCounts };

export class BatchExecutionService {
  constructor(
    private readonly repository = new BatchJobRepository(),
    private readonly sourceFactory: () => PlayerDataSource = whoScoredSource,
  ) {}

  async runScheduled(turn: BatchTurnRow): Promise<boolean> {
    const locked = await this.repository.withLock(async (session) => {
      const current = await new BatchJobRepository(session).turnById(turn.id);
      if (current?.status !== "PENDING") return false;
      if (current.process === "PLAYER_SYNC")
        await this.execute(current, session, () => this.sync(current, session));
      else await this.execute(current, session, () => this.recalculate(current, session));
      return true;
    });
    return locked.acquired ? locked.value : false;
  }

  async runManualSync(correlationId: string = randomUUID()) {
    const turn = await this.repository.createManualTurn("PLAYER_SYNC", "MANUAL_CLI", correlationId);
    const locked = await this.repository.withLock((session) =>
      this.execute(turn, session, () => this.sync(turn, session)),
    );
    if (!locked.acquired) {
      await this.repository.rejectManualTurn(turn.id);
      throw new ConflictError("Another batch is running");
    }
    return {
      status: locked.value.status,
      ...locked.value.counts,
      turnId: turn.id,
      correlationId: turn.correlationId,
    };
  }

  async runManualRecalculation(correlationId: string = randomUUID()) {
    const turn = await this.repository.createManualTurn(
      "QUOTE_RECALCULATION",
      "MANUAL_API",
      correlationId,
    );
    const locked = await this.repository.withLock((session) =>
      this.execute(turn, session, () => this.recalculate(turn, session)),
    );
    if (!locked.acquired) {
      await this.repository.rejectManualTurn(turn.id);
      throw new ConflictError("Another batch is running");
    }
    return locked.value.response;
  }

  private async sync(turn: BatchTurnRow, session: Database) {
    const counts = await new PlayerSyncService(
      this.sourceFactory(),
      new PlayerRepository(session),
      new MarketRepository(session),
    ).syncBatch(turn.id, session);
    return { status: "COMPLETED" as const, counts };
  }

  private async recalculate(turn: BatchTurnRow, session: Database) {
    const response = await new QuoteRecalculationService(
      new ValuationRepository(session),
      new PlayerRepository(session),
      new CompetitionContextRepository(session),
    ).recalculateBatch(turn.id, session);
    return {
      status: response.status as RunResult["status"],
      counts: {
        processed: response.calculated + response.rejected,
        succeeded: response.calculated,
        rejected: response.rejected,
      },
      response,
    };
  }

  private async execute<T extends RunResult>(
    turn: BatchTurnRow,
    session: Database,
    work: () => Promise<T>,
  ): Promise<T> {
    const repo = new BatchJobRepository(session);
    const started = await repo.setTurnRunning(turn.id);
    if (!started) throw new Error("Turn is no longer pending");
    recordBatchEvent("batch.started", started);
    try {
      const result = await work();
      recordBatchEvent("batch.finished", started, result.status, result.counts);
      return result;
    } catch (error) {
      const counts = { processed: 0, succeeded: 0, rejected: 0 };
      await repo.finishTurn(turn.id, "FAILED", counts, "BATCH_FAILED");
      recordBatchEvent("batch.finished", started, "FAILED", counts, "BATCH_FAILED");
      throw error;
    }
  }
}
