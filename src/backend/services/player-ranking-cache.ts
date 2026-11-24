import type {
  PlayerRankingCriteria,
  PlayerRankingResponse,
} from "@/backend/services/player-ranking.types";

const TTL_MS = 60_000;
const MAX_ENTRIES = 100;

type Entry = {
  response: PlayerRankingResponse;
  publicationRevision: number;
  createdAt: number;
  insertionOrder: number;
};

export class PlayerRankingCache {
  private readonly entries = new Map<string, Entry>();
  private nextInsertionOrder = 0;

  constructor(private readonly now: () => number = () => performance.now()) {}

  get size(): number {
    return this.entries.size;
  }

  get(
    strategyVersionId: string,
    criteria: PlayerRankingCriteria,
    publicationRevision: number,
  ): PlayerRankingResponse | undefined {
    const key = this.key(strategyVersionId, criteria);
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (
      this.now() - entry.createdAt >= TTL_MS ||
      entry.publicationRevision !== publicationRevision
    ) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.response;
  }

  put(
    strategyVersionId: string,
    criteria: PlayerRankingCriteria,
    publicationRevision: number,
    response: PlayerRankingResponse,
  ): void {
    const createdAt = this.now();
    for (const [key, entry] of this.entries) {
      if (createdAt - entry.createdAt >= TTL_MS) this.entries.delete(key);
    }

    const key = this.key(strategyVersionId, criteria);
    this.entries.delete(key);
    if (this.entries.size >= MAX_ENTRIES) {
      let oldestKey: string | undefined;
      let oldest: Entry | undefined;
      for (const [candidateKey, candidate] of this.entries) {
        if (
          !oldest ||
          candidate.createdAt < oldest.createdAt ||
          (candidate.createdAt === oldest.createdAt &&
            candidate.insertionOrder < oldest.insertionOrder)
        ) {
          oldestKey = candidateKey;
          oldest = candidate;
        }
      }
      if (oldestKey !== undefined) this.entries.delete(oldestKey);
    }
    this.entries.set(key, {
      response,
      publicationRevision,
      createdAt,
      insertionOrder: this.nextInsertionOrder++,
    });
  }

  private key(strategyVersionId: string, criteria: PlayerRankingCriteria): string {
    return JSON.stringify([
      strategyVersionId,
      criteria.league ?? null,
      criteria.team ?? null,
      criteria.position ?? null,
      criteria.page,
      criteria.limit,
    ]);
  }
}
