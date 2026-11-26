import { describe, expect, it } from "vitest";
import { PlayerRankingCache } from "@/backend/services/player-ranking-cache";
import {
  filteredRankingCriteria,
  oneHundredOneCriteria,
  otherRankingVersion,
  rankingCriteria,
  rankingResponse,
  rankingVersion,
} from "../../fixtures/player-ranking-cache";

describe("PlayerRankingCache", () => {
  it("invalidates an entry when the publication revision changes", () => {
    const cache = new PlayerRankingCache();
    cache.put(rankingVersion.id, rankingCriteria, 0, rankingResponse);
    expect(cache.get(rankingVersion.id, rankingCriteria, 0)).toBe(rankingResponse);
    expect(cache.get(rankingVersion.id, rankingCriteria, 1)).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("keys every criterion without delimiter collisions", () => {
    const cache = new PlayerRankingCache();
    cache.put(rankingVersion.id, filteredRankingCriteria, 0, rankingResponse);
    expect(cache.get(rankingVersion.id, filteredRankingCriteria, 0)).toBe(rankingResponse);
    for (const changed of [
      { ...filteredRankingCriteria, league: undefined },
      { ...filteredRankingCriteria, team: "Other" },
      { ...filteredRankingCriteria, position: undefined },
      { ...filteredRankingCriteria, page: 3 },
      { ...filteredRankingCriteria, limit: 20 },
    ]) {
      expect(cache.get(rankingVersion.id, changed, 0)).toBeUndefined();
    }
    expect(cache.get(otherRankingVersion.id, filteredRankingCriteria, 0)).toBeUndefined();
  });

  it("evicts the oldest generation after 101 keys without renewing it on a hit", () => {
    const cache = new PlayerRankingCache();
    for (const criteria of oneHundredOneCriteria.slice(0, 100)) {
      cache.put(rankingVersion.id, criteria, 0, rankingResponse);
    }
    expect(cache.get(rankingVersion.id, oneHundredOneCriteria[0], 0)).toBe(rankingResponse);
    cache.put(rankingVersion.id, oneHundredOneCriteria[100], 0, rankingResponse);
    expect(cache.size).toBe(100);
    expect(cache.get(rankingVersion.id, oneHundredOneCriteria[0], 0)).toBeUndefined();
    expect(cache.get(rankingVersion.id, oneHundredOneCriteria[1], 0)).toBe(rankingResponse);
  });

  it("moves a replaced entry to the newest position", () => {
    const cache = new PlayerRankingCache();
    for (const criteria of oneHundredOneCriteria.slice(0, 100)) {
      cache.put(rankingVersion.id, criteria, 0, rankingResponse);
    }
    cache.put(rankingVersion.id, oneHundredOneCriteria[0], 0, rankingResponse);
    cache.put(rankingVersion.id, oneHundredOneCriteria[100], 0, rankingResponse);
    expect(cache.get(rankingVersion.id, oneHundredOneCriteria[0], 0)).toBe(rankingResponse);
    expect(cache.get(rankingVersion.id, oneHundredOneCriteria[1], 0)).toBeUndefined();
  });
});
