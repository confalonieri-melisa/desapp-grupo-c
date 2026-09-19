import { League, Position } from "@/models/enums";

export const SCRAPED_PLAYER_STATISTICS = [
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

export type ScrapedPlayerStatistic = (typeof SCRAPED_PLAYER_STATISTICS)[number];

export type MinimalPlayerStatistics = Partial<
  Record<ScrapedPlayerStatistic, number>
>;

/** Normalized boundary object produced by an external football data adapter. */
export interface ScrapedPlayer {
  externalId: string;
  name: string;
  team: string;
  league: League;
  position: Position;
  statistics: MinimalPlayerStatistics;
}

/** Port used by the player ingestion application flow. */
export interface PlayerDataSource {
  readonly source: string;
  fetchPlayers(): Promise<ScrapedPlayer[]>;
}
