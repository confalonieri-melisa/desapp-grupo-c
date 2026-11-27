import { useEffect, useRef, useState } from "react";
import {
  getP2POffers,
  acceptP2POffer,
  publishP2POffer,
  cancelP2POffer,
  type P2PReceipt,
  type P2POffer,
} from "@/frontend/services/client/p2p-offers.service";
import { canAccept, classifyP2PError, validatePublish } from "../utils/p2p-trading";
export type P2PConfirmation =
  | { type: "accept"; offer: P2POffer; key: string; replay?: boolean }
  | { type: "publish"; quantity: number; unitPrice: number }
  | { type: "cancel"; offer: P2POffer };
export interface P2PResult {
  status: "idle" | "submitting" | "succeeded" | "rejected" | "uncertain";
  receipt?: P2PReceipt;
  published?: P2POffer;
  cancelled?: string;
  kind?: "accept" | "publish" | "cancel";
  error?: string;
  portfolioFailed?: boolean;
}
type Status = "idle" | "loading" | "ready" | "empty" | "error" | "refreshing";
interface State {
  scope: string;
  offers: P2POffer[];
  status: Status;
  error: string | null;
}
export function useP2POffers(
  token: string | null,
  playerId: string,
  onUnauthorized: () => void,
  refreshPortfolio: () => Promise<boolean | undefined> = async () => true,
  finance?: { userId: string; balance: number | null; holding: number | null; operable: boolean },
) {
  const scope = JSON.stringify([token, playerId]);
  const [state, setState] = useState<State>({ scope: "", offers: [], status: "idle", error: null });
  const [action, setAction] = useState<{
    scope: string;
    confirmation: P2PConfirmation | null;
    result: P2PResult;
  }>({ scope: "", confirmation: null, result: { status: "idle" } });
  const [draft, setDraft] = useState({ scope: "", quantity: "", price: "" });
  const busy = useRef(false);
  const epoch = useRef(0);
  const [forbidden, setForbidden] = useState("");
  const intent = useRef<{ scope: string; offer: P2POffer; key: string } | null>(null);
  const latest = useRef({ userId: "", balance: null as number | null, current: false });
  const current = useRef(scope);
  const generation = useRef(0);
  const callback = useRef(onUnauthorized);
  useEffect(() => {
    if (current.current !== scope) {
      busy.current = false;
      intent.current = null;
      setAction({ scope, confirmation: null, result: { status: "idle" } });
      setDraft({ scope, quantity: "", price: "" });
    }
    current.current = scope;
    callback.current = onUnauthorized;
  }, [scope, onUnauthorized]);
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
        // Invalidate async work; these refs are sequence counters, not DOM nodes.

        epoch.current++;
        setState({ scope, offers: [], status: "idle", error: null });
        setAction({ scope, confirmation: null, result: { status: "idle" } });
        setDraft({ scope, quantity: "", price: "" });
        intent.current = null;
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
      // Invalidate async work; these refs are sequence counters, not DOM nodes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      epoch.current++;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);
  const scoped: { confirmation: P2PConfirmation | null; result: P2PResult } =
    action.scope === scope ? action : { confirmation: null, result: { status: "idle" as const } };
  const openAccept = (
    offer: P2POffer,
    userId: string,
    balance: number | null,
    portfolioCurrent: boolean,
  ) => {
    latest.current = { userId, balance, current: portfolioCurrent };
    if (
      busy.current ||
      visible.status !== "ready" ||
      !visible.offers.some((o) => o.id === offer.id) ||
      !canAccept(offer, userId, balance, portfolioCurrent)
    )
      return;
    const value = { type: "accept" as const, offer, key: crypto.randomUUID() };
    intent.current = { scope, ...value };
    setAction({ scope, confirmation: value, result: { status: "idle" } });
  };
  const confirm = async () => {
    const c = scoped.confirmation;
    if (
      c?.type === "cancel" &&
      (visible.status !== "ready" || !visible.offers.some((o) => o.id === c.offer.id))
    )
      return;
    if (finance && !finance.operable) return;
    if (finance)
      latest.current = {
        userId: finance.userId,
        balance: finance.balance,
        current: finance.balance !== null,
      };
    if (
      c?.type === "publish" &&
      finance &&
      validatePublish(String(c.quantity), String(c.unitPrice), finance.holding).error
    )
      return;
    if (!token || !c || busy.current || current.current !== scope) return;
    if (
      c.type === "accept" &&
      !c.replay &&
      (!canAccept(c.offer, latest.current.userId, latest.current.balance, latest.current.current) ||
        visible.status !== "ready")
    )
      return;
    const actionEpoch = epoch.current;
    busy.current = true;
    if (c.type === "accept") intent.current = { scope, ...c };
    setAction({ scope, confirmation: null, result: { status: "submitting" } });
    try {
      if (c.type === "publish") {
        const published = await publishP2POffer(token, {
          playerId,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
        });
        if (current.current !== scope || epoch.current !== actionEpoch) return;
        setAction({ scope, confirmation: null, result: { status: "succeeded", published } });
        setDraft({ scope, quantity: "", price: "" });
        setState((old) => ({
          ...old,
          offers: [...old.offers.filter((o) => o.id !== published.id), published],
        }));
        void refresh();
        return;
      }
      if (c.type === "cancel") {
        await cancelP2POffer(token, c.offer.id);
        if (current.current !== scope || epoch.current !== actionEpoch) return;
        setAction({
          scope,
          confirmation: null,
          result: { status: "succeeded", cancelled: c.offer.id },
        });
        setState((old) => ({ ...old, offers: old.offers.filter((o) => o.id !== c.offer.id) }));
        void refresh();
        return;
      }
      const receipt = await acceptP2POffer(token, c.offer.id, c.key);
      if (current.current !== scope || epoch.current !== actionEpoch) return;
      setAction({ scope, confirmation: null, result: { status: "succeeded", receipt } });
      void refresh();
      const ok = await refreshPortfolio().catch(() => false);
      if (current.current === scope && epoch.current === actionEpoch)
        setAction((old) => ({ ...old, result: { ...old.result, portfolioFailed: !ok } }));
    } catch (error) {
      if (current.current !== scope || epoch.current !== actionEpoch) return;
      if ((error as { status?: number }).status === 401) {
        // Invalidate async work; these refs are sequence counters, not DOM nodes.

        epoch.current++;

        generation.current++;
        setState({ scope, offers: [], status: "idle", error: null });
        setAction({ scope, confirmation: null, result: { status: "idle" } });
        setDraft({ scope, quantity: "", price: "" });
        intent.current = null;
        callback.current();
        return;
      }
      if ((error as { status?: number }).status === 403) setForbidden(scope);
      const failure = classifyP2PError(error);
      if (failure.status === "uncertain")
        setState((old) => ({
          ...old,
          status: "error",
          error: "Resultado incierto. Actualiza la lista antes de otro intento.",
        }));
      setAction({ scope, confirmation: null, result: { ...failure, kind: c.type } });
    } finally {
      if (current.current === scope && epoch.current === actionEpoch) busy.current = false;
    }
  };
  const retryAccept = () => {
    const i = intent.current;
    if (i?.scope === scope && scoped.result.status === "uncertain")
      setAction({
        scope,
        confirmation: { type: "accept", offer: i.offer, key: i.key, replay: true },
        result: scoped.result,
      });
  };
  return {
    ...visible,
    forbidden: forbidden === scope,
    draft: draft.scope === scope ? draft : { scope, quantity: "", price: "" },
    setDraft: (quantity: string, price: string) => setDraft({ scope, quantity, price }),
    openPublish: (holding: number | null) => {
      if (
        busy.current ||
        forbidden === scope ||
        (scoped.result.status === "uncertain" &&
          visible.status !== "ready" &&
          visible.status !== "empty")
      )
        return;
      const d = draft.scope === scope ? draft : { quantity: "", price: "" };
      const v = validatePublish(d.quantity, d.price, holding);
      if (!v.error)
        setAction({
          scope,
          confirmation: { type: "publish", quantity: v.quantity, unitPrice: v.unitPrice },
          result: { status: "idle" },
        });
    },
    refresh,
    confirmation: scoped.confirmation,
    result: scoped.result,
    openCancel: (offer: P2POffer, userId: string) => {
      if (
        !busy.current &&
        visible.status === "ready" &&
        offer.sellerId === userId &&
        visible.offers.some((o) => o.id === offer.id)
      )
        setAction({ scope, confirmation: { type: "cancel", offer }, result: { status: "idle" } });
    },
    openAccept,
    confirm,
    retryAccept,
    cancelConfirmation: () => setAction((old) => ({ ...old, confirmation: null })),
  };
}
