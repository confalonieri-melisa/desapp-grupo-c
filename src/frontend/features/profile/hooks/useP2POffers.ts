import { useEffect, useRef, useState } from "react";
import { getP2POffers, type P2POffer } from "@/frontend/services/client/p2p-offers.service";
type Status = "idle" | "loading" | "ready" | "empty" | "error" | "refreshing";
interface State {
  scope: string;
  offers: P2POffer[];
  status: Status;
  error: string | null;
}
export function useP2POffers(token: string | null, playerId: string, onUnauthorized: () => void) {
  const scope = JSON.stringify([token, playerId]);
  const [state, setState] = useState<State>({ scope: "", offers: [], status: "idle", error: null });
  const current = useRef(scope);
  const generation = useRef(0);
  const callback = useRef(onUnauthorized);
  useEffect(() => {
    current.current = scope;
    callback.current = onUnauthorized;
  });
  const visible =
    state.scope === scope ? state : { scope, offers: [], status: "idle" as Status, error: null };
  const refresh = async () => {
    if (!token || !playerId || current.current !== scope) return false;
    const seq = ++generation.current;
    setState((old) => ({
      scope,
      offers: old.scope === scope ? old.offers : [],
      status: old.scope === scope && old.offers.length ? "refreshing" : "loading",
      error: null,
    }));
    try {
      const offers = await getP2POffers(token, playerId);
      if (current.current !== scope || seq !== generation.current) return false;
      setState({ scope, offers, status: offers.length ? "ready" : "empty", error: null });
      return true;
    } catch (error) {
      if (current.current !== scope || seq !== generation.current) return false;
      if ((error as { status?: number }).status === 401) {
        setState({ scope, offers: [], status: "idle", error: null });
        callback.current();
      } else
        setState((old) => ({
          ...old,
          status: "error",
          error: error instanceof Error ? error.message : "No se pudo cargar ofertas",
        }));
      return false;
    }
  };
  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);
  return { ...visible, refresh };
}
