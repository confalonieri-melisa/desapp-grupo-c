import { describe, expect, it } from "vitest";
import {
  PLAYER_STATISTIC_KEYS,
  type PlayerStatisticKey,
  type PlayerStatistics,
} from "@/backend/models/player-statistics";

describe("player statistics contract", () => {
  it("keeps one runtime catalog for persisted individual metrics", () => {
    const statistics: PlayerStatistics = { rating: 7.5 };
    const key: PlayerStatisticKey = "rating";

    expect(PLAYER_STATISTIC_KEYS).toContain(key);
    expect(statistics[key]).toBe(7.5);
    expect(PLAYER_STATISTIC_KEYS).toHaveLength(11);
  });
});
