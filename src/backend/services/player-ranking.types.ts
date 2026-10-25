import type { League, Position } from "@/backend/models/enums";
import type { PlayerFilters } from "@/backend/schemas/player.schema";
import type { Pagination } from "@/backend/utils/pagination";

export type { PlayerFilters };

export interface PlayerRankingCriteria extends PlayerFilters {
  page: number;
  limit: number;
}

export interface PlayerRankingRow {
  playerId: string;
  name: string;
  team: string;
  league: League;
  position: Position;
  finalScore: number;
  quoteValue: number;
  unit: string;
  calculatedAt: Date;
}

export interface PlayerRankingResult {
  rows: PlayerRankingRow[];
  total: number;
  page: number;
  limit: number;
}

export interface RankedPlayer {
  rank: number;
  player: {
    id: string;
    name: string;
    team: string;
    league: League;
    position: Position;
  };
  finalScore: number;
  quoteValue: number;
  unit: string;
  calculatedAt: Date;
}

export interface PlayerRankingResponse {
  strategyCode: string;
  strategyVersion: string;
  players: RankedPlayer[];
  pagination: Pagination;
}
