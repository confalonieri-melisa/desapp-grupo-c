import { League, Position } from "@/backend/models/enums";
import type { Player } from "@/backend/models/Player";

export interface PlayerCatalogCriteria {
  league?: League;
  team?: string;
  position?: Position;
  page?: number;
  limit?: number;
}

export interface PlayerCatalogResult {
  players: Player[];
  total: number;
  page: number;
  limit: number;
}
