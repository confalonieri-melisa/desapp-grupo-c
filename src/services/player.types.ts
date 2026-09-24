import { League, Position } from "@/models/enums";
import type { Player } from "@/models/Player";

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
