import { useEffect, useState } from "react";
import type { CatalogPlayer, PlayerCatalogFilters } from "@/catalog/player-catalog";
import { getPlayers } from "@/services/client/player.service";

interface UsePlayerCatalogResult {
  players: CatalogPlayer[];
  isLoading: boolean;
  error: string | null;
}

export function usePlayerCatalog(
  token: string | null,
  filters: PlayerCatalogFilters,
  onUnauthorized: () => void,
): UsePlayerCatalogResult {
  const [players, setPlayers] = useState<CatalogPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    getPlayers(token, filters, controller.signal)
      .then((response) => setPlayers(response.data))
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
  }, [filters, onUnauthorized, token]);

  return { players, isLoading, error };
}
