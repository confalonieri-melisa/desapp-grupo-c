import { useEffect, useState } from "react";
import { getPlayer, type PlayerApiDetail } from "@/services/client/player.service";

interface UsePlayerProfileResult {
  player: PlayerApiDetail | null;
  isLoading: boolean;
  error: string | null;
}

export function usePlayerProfile(
  token: string | null,
  playerId: string,
  onUnauthorized: () => void,
): UsePlayerProfileResult {
  const [player, setPlayer] = useState<PlayerApiDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !playerId) {
      return;
    }

    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setIsLoading(true);
        setError(null);
      }
    });

    getPlayer(token, playerId, controller.signal)
      .then(setPlayer)
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
            : "No se pudo cargar el jugador",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [onUnauthorized, playerId, token]);

  return { player, isLoading, error };
}
