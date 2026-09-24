import type { PlayerCatalogFilters } from "@/catalog/player-catalog";
import { League, Position } from "@/models/enums";

export const emptyPlayerCatalogFilters: PlayerCatalogFilters = {
  league: "",
  team: "",
  position: "",
};

export function parsePlayerCatalogFilters(
  searchParams: URLSearchParams,
): PlayerCatalogFilters {
  const league = searchParams.get("league");
  const position = searchParams.get("position");

  return {
    league: league && Object.values(League).includes(league as League)
      ? league as League
      : "",
    team: searchParams.get("team") ?? "",
    position: position && Object.values(Position).includes(position as Position)
      ? position as Position
      : "",
  };
}

export function parsePlayerCatalogPage(searchParams: URLSearchParams): number {
  const page = Number(searchParams.get("page"));
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export function serializePlayerCatalogFilters(
  filters: PlayerCatalogFilters,
  page = 1,
): string {
  const searchParams = new URLSearchParams();

  if (filters.league) searchParams.set("league", filters.league);
  if (filters.team) searchParams.set("team", filters.team);
  if (filters.position) searchParams.set("position", filters.position);
  if (page > 1) searchParams.set("page", String(page));

  return searchParams.toString();
}
