import { useEffect, useRef, useState } from "react";
import { buyPlayerTokens, getPortfolio, sellPlayerTokens, type MarketOperationResult, type PortfolioSnapshot } from "@/frontend/services/client/player-trading.service";
import { classifyBuyError, classifySellError, selectPlayerPosition, validateBuyQuantity, validateSellQuantity } from "../utils/player-trading";

export type PortfolioStatus = "idle" | "loading" | "success" | "empty" | "error" | "refreshing";

export interface PortfolioState {
  status: PortfolioStatus;
  snapshot: PortfolioSnapshot | null;
  error: string | null;
  generation: number;
}

interface TradingState {
  token: string | null;
  playerId: string;
  portfolio: PortfolioState;
}

interface RequestSlot {
  generation: number;
  controller?: AbortController;
}

export interface OrderConfirmation {
  type: "BUY" | "SELL";
  playerId: string;
  playerName: string;
  quantity: number;
  quoteValue: number;
  estimatedTotal: number;
}

export type OrderStatus = "idle" | "submitting" | "succeeded" | "rejected" | "uncertain";
export interface OrderState {
  status: OrderStatus;
  receipt: MarketOperationResult | null;
  error: string | null;
  playerId: string | null;
  playerName: string | null;
}

interface ScopedDraft { token: string | null; playerId: string; quantity: string; error: string | null }
interface ScopedConfirmation { token: string; value: OrderConfirmation }
interface ScopedOrder extends OrderState { token: string | null }

const idleOrder = (token: string | null = null): ScopedOrder => ({
  token, status: "idle", receipt: null, error: null, playerId: null, playerName: null,
});

const idlePortfolio = (generation = 0): PortfolioState => ({ status: "idle", snapshot: null, error: null, generation });
const initial = (token: string | null = null, playerId = ""): TradingState => ({
  token, playerId, portfolio: idlePortfolio(),
});

function invalidate(slot: RequestSlot) {
  slot.controller?.abort();
  slot.generation++;
}

export function usePlayerTrading(token: string | null, playerId: string, onUnauthorized: () => void) {
  const [state, setState] = useState<TradingState>(initial);
  const [draft, setDraft] = useState<ScopedDraft>({ token: null, playerId: "", quantity: "", error: null });
  const [pendingConfirmation, setConfirmation] = useState<ScopedConfirmation | null>(null);
  const [orderState, setOrder] = useState<ScopedOrder>(idleOrder);
  const unauthorized = useRef(onUnauthorized);
  const request = useRef<RequestSlot>({ generation: 0 });
  const identity = useRef({ token, playerId });
  const loadedIdentity = useRef({ token, playerId });
  const latestLoad = useRef<() => Promise<void>>(async () => {});
  const submission = useRef<{ token: string; sequence: number } | null>(null);
  const sequence = useRef(0);
  useEffect(() => { unauthorized.current = onUnauthorized; }, [onUnauthorized]);
  useEffect(() => {
    if (submission.current?.token !== token) submission.current = null;
    identity.current = { token, playerId };
  }, [token, playerId]);

  const matches = !!token && !!playerId && state.token === token && state.playerId === playerId;
  const visible = matches ? state.portfolio : idlePortfolio();
  const draftMatches = draft.token === token && draft.playerId === playerId;
  const draftQuantity = draftMatches ? draft.quantity : "";
  const draftError = draftMatches ? draft.error : null;
  const confirmation = pendingConfirmation?.token === token && pendingConfirmation.value.playerId === playerId
    ? pendingConfirmation.value : null;
  const order: OrderState = orderState.token === token ? orderState : idleOrder();

  const load = async () => {
    if (identity.current.token !== token || identity.current.playerId !== playerId) return;
    if (loadedIdentity.current.token !== token) {
      submission.current = null;
      setState(initial(token, playerId));
      setDraft({ token, playerId, quantity: "", error: null });
      setConfirmation(null);
      setOrder(idleOrder(token));
    }
    loadedIdentity.current = { token, playerId };
    if (!token || !playerId) return;
    setDraft((old) => old.token === token && old.playerId === playerId
      ? old : { token, playerId, quantity: "", error: null });
    setConfirmation((old) => old?.token === token && old.value.playerId === playerId ? old : null);
    const slot = request.current;
    invalidate(slot);
    const controller = new AbortController();
    slot.controller = controller;
    const generation = slot.generation;
    const valid = () => !controller.signal.aborted && generation === slot.generation
      && identity.current.token === token && identity.current.playerId === playerId;

    setState((old) => ({
      token, playerId,
      portfolio: {
        status: old.token === token && old.playerId === playerId && old.portfolio.snapshot ? "refreshing" : "loading",
        snapshot: null, error: null, generation,
      },
    }));

    try {
      const snapshot = await getPortfolio(token, controller.signal);
      if (!valid()) return;
      setState({ token, playerId, portfolio: {
        status: snapshot.items.length ? "success" : "empty", snapshot, error: null, generation,
      } });
    } catch (error) {
      if (!valid()) return;
      if ((error as { status?: number })?.status === 401) {
        invalidate(slot);
        setState(initial(token, playerId));
        setDraft({ token, playerId, quantity: "", error: null });
        setConfirmation(null);
        setOrder(idleOrder(token));
        unauthorized.current();
        return;
      }
      setState({ token, playerId, portfolio: {
        status: "error", snapshot: null,
        error: error instanceof Error ? error.message : "No se pudo cargar el portfolio",
        generation,
      } });
    }
  };

  useEffect(() => { latestLoad.current = load; });

  useEffect(() => {
    const slot = request.current;
    // Reset financial state on identity changes before another session can render it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return () => invalidate(slot);
    // Reads depend on identity, never on callback identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, playerId]);

  const setDraftQuantity = (quantity: string) => {
    if (!token || !playerId) return;
    setDraft({ token, playerId, quantity, error: null });
  };

  const openConfirmation = (type: "BUY" | "SELL", playerName: string, quoteValue: number) => {
    if (!token || !playerId || submission.current || !matches ||
      (visible.status !== "success" && visible.status !== "empty")) {
      return;
    }
    const result = type === "BUY"
      ? validateBuyQuantity(draftQuantity, quoteValue, visible.snapshot?.creditBalance ?? null)
      : validateSellQuantity(draftQuantity, quoteValue,
        visible.snapshot ? selectPlayerPosition(visible.snapshot, playerId).quantity : null);
    if (result.error || result.quantity === null || result.estimatedTotal === null) {
      setDraft({ token, playerId, quantity: draftQuantity, error: result.error });
      return;
    }
    setDraft({ token, playerId, quantity: draftQuantity, error: null });
    setConfirmation({ token, value: {
      type, playerId, playerName, quantity: result.quantity,
      quoteValue, estimatedTotal: result.estimatedTotal,
    } });
  };

  const openBuyConfirmation = (playerName: string, quoteValue: number) => openConfirmation("BUY", playerName, quoteValue);
  const openSellConfirmation = (playerName: string, quoteValue: number) => openConfirmation("SELL", playerName, quoteValue);

  const cancelConfirmation = () => setConfirmation(null);

  const confirmOrder = (currentQuoteValue?: number) => {
    if (!token || !confirmation || submission.current || identity.current.token !== token ||
      identity.current.playerId !== playerId || !matches ||
      (visible.status !== "success" && visible.status !== "empty")) return;

    const validated = confirmation.type === "BUY"
      ? validateBuyQuantity(String(confirmation.quantity),
        currentQuoteValue ?? null, visible.snapshot?.creditBalance ?? null)
      : validateSellQuantity(String(confirmation.quantity), currentQuoteValue ?? null,
        visible.snapshot ? selectPlayerPosition(visible.snapshot, playerId).quantity : null);
    if (validated.error || validated.quantity === null || validated.estimatedTotal === null) {
      setDraft({ token, playerId, quantity: draftQuantity, error: validated.error });
      setConfirmation(null);
      return;
    }
    if (currentQuoteValue !== undefined && currentQuoteValue !== confirmation.quoteValue) {
      setDraft({ token, playerId, quantity: draftQuantity, error: "La cotización cambió. Revisá la operación otra vez" });
      setConfirmation(null);
      return;
    }

    const key = { token, sequence: ++sequence.current };
    submission.current = key;
    setConfirmation(null);
    setOrder({ token, status: "submitting", receipt: null, error: null,
      playerId: confirmation.playerId, playerName: confirmation.playerName });

    const submit = async () => {
      try {
        const execute = confirmation.type === "BUY" ? buyPlayerTokens : sellPlayerTokens;
        const receipt = await execute(token, {
          playerId: confirmation.playerId, quantity: confirmation.quantity,
        });
        if (identity.current.token !== token || submission.current !== key) return;
        setOrder({ token, status: "succeeded", receipt, error: null,
          playerId: confirmation.playerId, playerName: confirmation.playerName });
        await latestLoad.current();
      } catch (error) {
        if (identity.current.token !== token || submission.current !== key) return;
        if ((error as { status?: number })?.status === 401) {
          invalidate(request.current);
          setState(initial(token, playerId));
          setDraft({ token, playerId, quantity: "", error: null });
          setOrder(idleOrder(token));
          unauthorized.current();
          return;
        }
        const failure = confirmation.type === "BUY" ? classifyBuyError(error) : classifySellError(error);
        setOrder({ token, status: failure.kind, receipt: null, error: failure.message,
          playerId: confirmation.playerId, playerName: confirmation.playerName });
      } finally {
        if (submission.current === key) submission.current = null;
      }
    };
    void submit();
  };

  return {
    portfolio: visible,
    retryPortfolio: () => { void load(); },
    draftQuantity,
    draftError,
    setDraftQuantity,
    confirmation,
    openBuyConfirmation,
    openSellConfirmation,
    cancelConfirmation,
    confirmOrder,
    order,
  };
}
