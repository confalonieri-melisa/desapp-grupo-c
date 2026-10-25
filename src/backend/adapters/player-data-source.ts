import { League, Position } from "@/backend/models/enums";
import {
  PLAYER_STATISTIC_KEYS,
  type PlayerStatisticKey,
  type PlayerStatistics,
} from "@/backend/models/player-statistics";

export { PLAYER_STATISTIC_KEYS };
export type ScrapedPlayerStatistic = PlayerStatisticKey;
export type MinimalPlayerStatistics = PlayerStatistics;

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
