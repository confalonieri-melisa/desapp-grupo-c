import type { League, Position } from '@/backend/models/enums';

export const RANKING_PAGE_SIZE = 20;

export interface RankingEntry {
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
  calculatedAt: string;
}

export interface RankingPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RankingResponse {
  strategyCode: string;
  strategyVersion: string;
  players: RankingEntry[];
  pagination: RankingPagination;
}

export interface RankingSelection {
  league?: League;
  team?: string;
  position?: Position;
  page: number;
}
