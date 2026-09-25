import type { League, Position } from "@/models/enums";
import type { PlayerStatistics } from "@/models/Player";
import type { PlayerCatalogFilters } from "@/catalog/player-catalog";

export interface PlayerApiItem {
  id: string;
  name: string;
  team: string;
  league: League;
  position: Position;
  statistics: PlayerStatistics;
  currentQuote: number;
  totalTokens: number;
}

export interface PlayerApiDetail extends PlayerApiItem {
  createdAt: string;
  updatedAt: string;
}

interface PlayerApiResponse {
  data: PlayerApiItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PlayerPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function getQueryString(filters: PlayerCatalogFilters, page: number): string {
  const query = new URLSearchParams({
    page: String(page),
    limit: "12",
  });

  if (filters.league) {
    query.set("league", filters.league);
  }

  if (filters.team) {
    query.set("team", filters.team);
  }

  if (filters.position) {
    query.set("position", filters.position);
  }

  return query.toString();
}

export async function getPlayers(
  token: string,
  filters: PlayerCatalogFilters,
  page: number,
  signal?: AbortSignal,
): Promise<PlayerApiResponse> {
  const response = await fetch(`/api/players?${getQueryString(filters, page)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = undefined;
  }

  if (!response.ok) {
    const apiError = typeof data === "object" && data !== null
      ? data as { message?: unknown; error?: unknown }
      : {};
    const message = typeof apiError.message === "string"
      ? apiError.message
      : typeof apiError.error === "string"
        ? apiError.error
        : "No se pudieron cargar los jugadores";

    throw new Error(message);
  }

  return data as PlayerApiResponse;
}
export async function getPlayer(
  token: string,
  id: string,
  signal?: AbortSignal,
): Promise<PlayerApiDetail> {
  const response = await fetch(`/api/players/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = undefined;
  }

  if (!response.ok) {
    const apiError = typeof data === "object" && data !== null
      ? data as { message?: unknown; error?: unknown }
      : {};
    const message = typeof apiError.message === "string"
      ? apiError.message
      : typeof apiError.error === "string"
        ? apiError.error
        : "No se pudo cargar el jugador";

    throw new Error(message);
  }

  return data as PlayerApiDetail;
}
