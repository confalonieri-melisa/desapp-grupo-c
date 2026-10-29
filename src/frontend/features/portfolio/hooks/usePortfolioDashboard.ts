import { useCallback, useEffect, useRef, useState } from "react";
import { getPortfolio, type PortfolioSnapshot } from "@/frontend/services/client/player-trading.service";
import { getPlayer, type PlayerApiDetail } from "@/frontend/services/client/player.service";
import { PORTFOLIO_UPDATED_EVENT, type PortfolioUpdate } from "@/frontend/services/client/portfolio-events";

type Phase = "initial-loading" | "content" | "empty" | "refreshing" | "initial-error" | "stale-error";
type DashboardState = { token: string | null; snapshot: PortfolioSnapshot | null; names: Record<string, string>; players: Record<string, PlayerApiDetail>; phase: Phase; error: string | null };
const initial = (token: string | null = null): DashboardState => ({ token, snapshot: null, names: {}, players: {}, phase: "initial-loading", error: null });

export function usePortfolioDashboard(token: string | null, onUnauthorized: () => void) {
  const [state, setState] = useState<DashboardState>(() => initial(token));
  const identity = useRef(token);
  const unauthorized = useRef(onUnauthorized);
  const generation = useRef(0);
  const portfolioController = useRef<AbortController | null>(null);
  const nameController = useRef<AbortController | null>(null);
  const knownNames = useRef<Record<string, string>>({});
  const pendingNames = useRef(new Set<string>());

  useEffect(() => { identity.current = token; unauthorized.current = onUnauthorized; }, [token, onUnauthorized]);

  const resolveNames = useCallback((snapshot: PortfolioSnapshot, currentToken: string) => {
    const controller = nameController.current ?? new AbortController();
    nameController.current = controller;
    for (const id of new Set(snapshot.items.map((item) => item.playerId))) {
      if (knownNames.current[id] || pendingNames.current.has(id)) continue;
      pendingNames.current.add(id);
      void getPlayer(currentToken, id, controller.signal).then((player) => {
        if (identity.current !== currentToken || controller.signal.aborted) return;
        knownNames.current[id] = player.name;
        setState((old) => old.token === currentToken ? { ...old, names: { ...old.names, [id]: player.name }, players: { ...old.players, [id]: player } } : old);
      }).catch(() => { /* The identifier remains visible. */ }).finally(() => pendingNames.current.delete(id));
    }
  }, []);

  const load = useCallback(() => {
    if (!token || identity.current !== token) return;
    portfolioController.current?.abort();
    const controller = new AbortController();
    portfolioController.current = controller;
    const request = ++generation.current;
    setState((old) => ({ token, snapshot: old.token === token ? old.snapshot : null,
      names: old.token === token ? old.names : {}, players: old.token === token ? old.players : {},
      phase: old.token === token && old.snapshot ? "refreshing" : "initial-loading", error: null }));
    void getPortfolio(token, controller.signal).then((snapshot) => {
      if (controller.signal.aborted || identity.current !== token || generation.current !== request) return;
      setState((old) => ({ token, snapshot, names: old.token === token ? old.names : {}, players: old.token === token ? old.players : {},
        phase: snapshot.items.length ? "content" : "empty", error: null }));
      resolveNames(snapshot, token);
    }).catch((error: unknown) => {
      if (controller.signal.aborted || identity.current !== token || generation.current !== request) return;
      if ((error as { status?: number })?.status === 401) {
        generation.current++;
        portfolioController.current?.abort();
        nameController.current?.abort();
        knownNames.current = {};
        pendingNames.current.clear();
        setState(initial(null));
        unauthorized.current();
        return;
      }
      setState((old) => ({ ...old, phase: old.snapshot ? "stale-error" : "initial-error",
        error: error instanceof Error ? error.message : "No se pudo cargar el portfolio" }));
    });
  }, [token, resolveNames]);

  useEffect(() => {
    portfolioController.current?.abort();
    nameController.current?.abort();
    nameController.current = null;
    generation.current++;
    knownNames.current = {};
    pendingNames.current.clear();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(initial(token));
    if (token) load();
    return () => { portfolioController.current?.abort(); nameController.current?.abort(); };
  }, [token, load]);

  useEffect(() => {
    if (!token) return;
    const receive = (event: Event) => {
      const update = (event as CustomEvent<PortfolioUpdate>).detail;
      if (!update || update.token !== token || identity.current !== token) return;
      portfolioController.current?.abort();
      generation.current++;
      if (update.status === "loading") {
        setState((old) => old.token === token ? { ...old, phase: old.snapshot ? "refreshing" : "initial-loading", error: null } : old);
      } else if (update.status === "success" && update.snapshot) {
        const snapshot = update.snapshot;
        setState((old) => ({ token, snapshot, names: old.token === token ? old.names : {}, players: old.token === token ? old.players : {},
          phase: snapshot.items.length ? "content" : "empty", error: null }));
        resolveNames(snapshot, token);
      } else if (update.status === "error") {
        setState((old) => old.token === token ? { ...old, phase: old.snapshot ? "stale-error" : "initial-error",
          error: "No se pudo actualizar el portfolio" } : old);
      }
    };
    window.addEventListener(PORTFOLIO_UPDATED_EVENT, receive);
    return () => window.removeEventListener(PORTFOLIO_UPDATED_EVENT, receive);
  }, [token, resolveNames]);

  return { ...state.token === token ? state : initial(token), retry: load };
}
