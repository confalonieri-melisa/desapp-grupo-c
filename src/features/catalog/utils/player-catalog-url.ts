import type { PlayerCatalogFilters } from "@/catalog/player-catalog";
import { isOfficialLeague, isPosition } from "@/models/enums";

export const emptyPlayerCatalogFilters: PlayerCatalogFilters = {
  league: "",
  team: "",
  position: "",
};

function getEnumParam<T extends string>(
  searchParams: URLSearchParams,
  name: string,
  isValid: (value: unknown) => value is T,
): T | "" {
  const value = searchParams.get(name);
  return isValid(value) ? value : "";
}

export function parsePlayerCatalogFilters(
  searchParams: URLSearchParams,
): PlayerCatalogFilters {
  return {
    league: getEnumParam(searchParams, "league", isOfficialLeague),
    team: searchParams.get("team") ?? "",
    position: getEnumParam(searchParams, "position", isPosition),
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
