import { useEffect, useRef, useState } from "react";
import { getPoolAvailability } from "@/frontend/services/client/pool-availability.service";
export function usePoolAvailability(
  token: string | null,
  playerId: string,
  onUnauthorized: () => void,
  confirmedPurchaseId?: string,
) {
  const scope = JSON.stringify([token, playerId]);
  const [state, setState] = useState({
    scope: "",
    status: "loading" as "loading" | "success" | "error",
    availableQuantity: null as number | null,
    error: null as string | null,
  });
  const identity = useRef(scope);
  const generation = useRef(0);
  const callback = useRef(onUnauthorized);
  useEffect(() => {
    identity.current = scope;
    callback.current = onUnauthorized;
  });
  const refresh = async () => {
    if (!token || !playerId || identity.current !== scope) return;
    const seq = ++generation.current;
    setState({ scope, status: "loading", availableQuantity: null, error: null });
    try {
      const value = await getPoolAvailability(token, playerId);
      if (seq !== generation.current || identity.current !== scope) return;
      setState({
        scope,
        status: "success",
        availableQuantity: value.availableQuantity,
        error: null,
      });
    } catch (error) {
      if (seq !== generation.current || identity.current !== scope) return;
      setState({
        scope,
        status: "error",
        availableQuantity: null,
        error: error instanceof Error ? error.message : "No disponible",
      });
      if ((error as { status?: number }).status === 401) callback.current();
    }
  };
  // Read once for the current identity, clearing stale financial availability.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    return () => {
      generation.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, confirmedPurchaseId]);
  return {
    ...(state.scope === scope
      ? state
      : { scope, status: "loading" as const, availableQuantity: null, error: null }),
    refresh,
  };
}
