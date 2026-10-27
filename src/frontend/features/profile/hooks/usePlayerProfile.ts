import { useEffect, useRef, useState } from "react";
import { getPlayer, type PlayerApiDetail } from "@/frontend/services/client/player.service";

interface ProfileState {
  token: string | null;
  playerId: string;
  player: PlayerApiDetail | null;
  isLoading: boolean;
  error: string | null;
}

export function usePlayerProfile(token: string | null, playerId: string, onUnauthorized: () => void) {
  const [state, setState] = useState<ProfileState>({ token: null, playerId: "", player: null, isLoading: false, error: null });
  const unauthorized = useRef(onUnauthorized);
  useEffect(() => { unauthorized.current = onUnauthorized; }, [onUnauthorized]);

  useEffect(() => {
    if (!token || !playerId) return;
    const controller = new AbortController();
    const base = { token, playerId, player: null, isLoading: true, error: null };
    const load = async () => {
      setState(base);
      try {
        const player = await getPlayer(token, playerId, controller.signal);
        if (!controller.signal.aborted) setState({ ...base, player, isLoading: false });
      } catch (error) {
        if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) return;
        if ((error as { status?: number })?.status === 401 || (error instanceof Error && error.message === "Unauthorized")) {
          setState({ ...base, isLoading: false });
          unauthorized.current();
          return;
        }
        const status = (error as { status?: number })?.status;
        const message = status === 404 ? "No se encontró al jugador" : status === 400 ? "El jugador solicitado no es válido" : error instanceof Error ? error.message : "No se pudo cargar el jugador";
        setState({ ...base, isLoading: false, error: message });
      }
    };
    void load();
    return () => controller.abort();
  }, [token, playerId]);

  const matches = !!token && state.token === token && state.playerId === playerId;
  return {
    player: matches && state.player?.id === playerId ? state.player : null,
    isLoading: !!token && !!playerId && (!matches || state.isLoading),
    error: matches ? state.error : null,
  };
}
