import { useEffect, useState } from "react";
import type { CatalogPlayer, PlayerCatalogFilters } from "@/catalog/player-catalog";
import { getPlayers, type PlayerPagination } from "@/services/client/player.service";

interface UsePlayerCatalogResult {
  players: CatalogPlayer[];
  isLoading: boolean;
  error: string | null;
  pagination: PlayerPagination;
}

export function usePlayerCatalog(
  token: string | null,
  filters: PlayerCatalogFilters,
  page: number,
  onUnauthorized: () => void,
): UsePlayerCatalogResult {
  const [players, setPlayers] = useState<CatalogPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PlayerPagination>({
    total: 0,
    page: 1,
    limit: 18,
    totalPages: 0,
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    const controller = new AbortController();

    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setIsLoading(true);
        setError(null);
      }
    });

    getPlayers(token, filters, page, controller.signal)
      .then((response) => {
        setPlayers(response.data);
        setPagination(response.pagination);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }

        if (requestError instanceof Error && requestError.message === "Unauthorized") {
          onUnauthorized();
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudieron cargar los jugadores",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [filters, onUnauthorized, page, token]);

  return { players, isLoading, error, pagination };
}
