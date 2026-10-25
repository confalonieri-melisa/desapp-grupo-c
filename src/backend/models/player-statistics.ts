/** Individual player metrics persisted from the WhoScored dataset. */
export const PLAYER_STATISTIC_KEYS = [
  "appearances",
  "minutesPlayed",
  "rating",
  "goals",
  "assists",
  "shotsPerGame",
  "tacklesPerGame",
  "interceptionsPerGame",
  "foulsPerGame",
  "yellowCards",
  "redCards",
] as const;

export const PLAYER_STATISTIC_KEY_SET = new Set<string>(PLAYER_STATISTIC_KEYS);

export type PlayerStatisticKey = (typeof PLAYER_STATISTIC_KEYS)[number];

export type PlayerStatistics = Partial<Record<PlayerStatisticKey, number>>;
