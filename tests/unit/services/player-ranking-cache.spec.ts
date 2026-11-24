import { describe, expect, it } from "vitest";
import { PlayerRankingCache } from "@/backend/services/player-ranking-cache";
import {
  emptyRankingResponse,
  filteredRankingCriteria,
  oneHundredOneCriteria,
  otherRankingVersion,
  rankingCriteria,
  rankingResponse,
  rankingVersion,
} from "../../fixtures/player-ranking-cache";

describe("PlayerRankingCache", () => {
  it("reuses complete and empty responses only before 60 seconds at the same revision", () => {
    let now = 0;
    const cache = new PlayerRankingCache(() => now);
    cache.put(rankingVersion.id, rankingCriteria, 1, rankingResponse);
    cache.put(rankingVersion.id, filteredRankingCriteria, 1, emptyRankingResponse);
    now = 59_999;
    expect(cache.get(rankingVersion.id, rankingCriteria, 1)).toBe(rankingResponse);
    expect(cache.get(rankingVersion.id, filteredRankingCriteria, 1)).toBe(emptyRankingResponse);
    expect(cache.get(rankingVersion.id, rankingCriteria, 2)).toBeUndefined();
    now = 60_000;
    expect(cache.get(rankingVersion.id, rankingCriteria, 1)).toBeUndefined();
    expect(cache.get(rankingVersion.id, filteredRankingCriteria, 1)).toBeUndefined();
  });

  it("keeps a fixed lifetime even when the entry is hit", () => {
    let now = 0;
    const cache = new PlayerRankingCache(() => now);
    cache.put(rankingVersion.id, rankingCriteria, 0, rankingResponse);
    now = 30_000;
    expect(cache.get(rankingVersion.id, rankingCriteria, 0)).toBe(rankingResponse);
    now = 60_000;
    expect(cache.get(rankingVersion.id, rankingCriteria, 0)).toBeUndefined();
  });

  it("keys every criterion without delimiter collisions", () => {
    const cache = new PlayerRankingCache(() => 0);
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
    let now = 0;
    const cache = new PlayerRankingCache(() => now);
    for (const criteria of oneHundredOneCriteria.slice(0, 100)) {
      cache.put(rankingVersion.id, criteria, 0, rankingResponse);
      now += 1;
    }
    expect(cache.get(rankingVersion.id, oneHundredOneCriteria[0], 0)).toBe(rankingResponse);
    cache.put(rankingVersion.id, oneHundredOneCriteria[100], 0, rankingResponse);
    expect(cache.size).toBe(100);
    expect(cache.get(rankingVersion.id, oneHundredOneCriteria[0], 0)).toBeUndefined();
    expect(cache.get(rankingVersion.id, oneHundredOneCriteria[1], 0)).toBe(rankingResponse);
  });

  it("uses insertion order to break a same-time generation tie", () => {
    const cache = new PlayerRankingCache(() => 0);
    for (const criteria of oneHundredOneCriteria) {
      cache.put(rankingVersion.id, criteria, 0, rankingResponse);
    }
    expect(cache.get(rankingVersion.id, oneHundredOneCriteria[0], 0)).toBeUndefined();
    expect(cache.get(rankingVersion.id, oneHundredOneCriteria[1], 0)).toBe(rankingResponse);
  });
});
