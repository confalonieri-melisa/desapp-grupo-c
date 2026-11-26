import type {
  PlayerRankingCriteria,
  PlayerRankingResponse,
} from "@/backend/services/player-ranking.types";

const PLAYER_RANKING_CACHE_MAX_ENTRIES = 100;

type Entry = {
  response: PlayerRankingResponse;
  publicationRevision: number;
};

export class PlayerRankingCache {
  private readonly entries = new Map<string, Entry>();

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
    if (entry.publicationRevision !== publicationRevision) {
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
    const key = this.key(strategyVersionId, criteria);
    this.entries.delete(key);
    this.evictOldestIfFull();
    this.entries.set(key, { response, publicationRevision });
  }

  private evictOldestIfFull(): void {
    if (this.entries.size < PLAYER_RANKING_CACHE_MAX_ENTRIES) return;
    const oldestKey = this.entries.keys().next().value;
    if (oldestKey !== undefined) this.entries.delete(oldestKey);
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
