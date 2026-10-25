import { useEffect, useRef, useState } from "react";
import { getPlayerQuotes, type PlayerQuoteDto } from "@/frontend/services/client/player-quotes.service";
import { isValidQuoteDate } from "../utils/player-quotes";

type Status = "idle" | "loading" | "success" | "empty" | "error";
interface Channel {
  status: Status;
  items: PlayerQuoteDto[];
  error: string | null;
  generation: number;
}
interface QuotesState {
  token: string | null;
  playerId: string;
  history: Channel;
  dated: Channel;
  selectedDate: string;
  requestedDate: string;
  dateError: string | null;
  playerError: string | null;
  expired: boolean;
}
interface RequestSlot { generation: number; controller?: AbortController }
const idle = (generation = 0): Channel => ({ status: "idle", items: [], error: null, generation });
const initial = (token: string | null = null, playerId = ""): QuotesState => ({
  token, playerId, history: idle(), dated: idle(), selectedDate: "", requestedDate: "", dateError: null, playerError: null, expired: false,
});
function invalidate(slot: RequestSlot) {
  slot.controller?.abort();
  slot.generation++;
}

export function usePlayerQuotes(token: string | null, playerId: string, onUnauthorized: () => void) {
  const [state, setState] = useState<QuotesState>(initial);
  const unauthorized = useRef(onUnauthorized);
  const historyRequest = useRef<RequestSlot>({ generation: 0 });
  const dateRequest = useRef<RequestSlot>({ generation: 0 });
  useEffect(() => { unauthorized.current = onUnauthorized; }, [onUnauthorized]);

  const matches = !!token && !!playerId && state.token === token && state.playerId === playerId;
  const visible = matches ? state : initial(token, playerId);

  const load = async (channel: "history" | "dated", date?: string) => {
    if (!token || !playerId) return;
    const slot = channel === "history" ? historyRequest.current : dateRequest.current;
    invalidate(slot);
    const controller = new AbortController();
    const generation = slot.generation;
    slot.controller = controller;
    const valid = () => !controller.signal.aborted && generation === slot.generation;
    setState((old) => ({
      ...(old.token === token && old.playerId === playerId ? old : initial(token, playerId)),
      [channel]: { ...idle(generation), status: "loading" },
      ...(channel === "dated" ? { requestedDate: date!, dateError: null } : {}),
    }));
    try {
      const response = await getPlayerQuotes(token, playerId, date, controller.signal);
      if (!valid()) return;
      setState((old) => ({ ...old, [channel]: {
        status: response.items.length ? "success" : "empty", items: response.items, error: null, generation,
      } }));
    } catch (error) {
      if (!valid()) return;
      const status = (error as { status?: number })?.status;
      const message = error instanceof Error ? error.message : "No se pudieron cargar las cotizaciones";
      const playerError = status === 404 && message === "Player not found" ? "No se encontró al jugador" : status === 400 && message === "Invalid player id" ? "El jugador solicitado no es válido" : null;
      if (status === 401 || playerError) {
        invalidate(historyRequest.current); invalidate(dateRequest.current);
        setState({ ...initial(token, playerId), playerError, expired: status === 401 });
        if (status === 401) unauthorized.current();
        return;
      }
      const empty = channel === "dated" && status === 404 && message === "Quote not available for the requested date";
      const invalidDate = channel === "dated" && status === 400 && message === "Invalid date";
      setState((old) => ({ ...old,
        [channel]: { ...idle(generation), status: empty ? "empty" : "error", error: empty ? null : message },
        ...(invalidDate ? { dateError: "Elegí una fecha calendario válida" } : {}),
      }));
    }
  };

  useEffect(() => {
    const historySlot = historyRequest.current;
    const dateSlot = dateRequest.current;
    void load("history");
    return () => { invalidate(historySlot); invalidate(dateSlot); };
    // Reads depend on identity, never on callback identity or date edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, playerId]);

  const setSelectedDate = (date: string) => {
    invalidate(dateRequest.current);
    setState((old) => ({ ...old, selectedDate: date, requestedDate: "", dated: idle(dateRequest.current.generation), dateError: null }));
  };
  const queryDate = () => {
    if (!isValidQuoteDate(visible.selectedDate)) {
      invalidate(dateRequest.current);
      setState((old) => ({ ...old, dated: idle(dateRequest.current.generation), requestedDate: "", dateError: "Elegí una fecha calendario válida" }));
      return;
    }
    void load("dated", visible.selectedDate);
  };

  return {
    history: visible.history,
    dated: visible.dated,
    current: visible.history.items[0],
    selectedDate: visible.selectedDate,
    requestedDate: visible.requestedDate,
    dateError: visible.dateError,
    playerError: visible.playerError,
    expired: visible.expired,
    retryHistory: () => { void load("history"); },
    setSelectedDate,
    clearDate: () => setSelectedDate(""),
    queryDate,
  };
}
