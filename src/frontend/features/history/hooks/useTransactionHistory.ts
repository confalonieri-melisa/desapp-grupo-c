import { useCallback, useEffect, useRef, useState } from 'react';
import {
  HISTORY_PAGE_SIZE,
  mergeHistoryPage,
  type HistoryViewState,
  type TransactionHistoryItem,
} from '@/frontend/features/history/history';
import { getTransactionHistory, HistoryHttpError } from '@/frontend/services/client/transaction-history.service';
import { getPlayer, PlayerHttpError } from '@/frontend/services/client/player.service';

const emptyState = (sessionKey: string | null): HistoryViewState => ({
  sessionKey,
  items: [],
  players: {},
  phase: 'initial-loading',
  nextOffset: 0,
  hasMore: false,
  error: null,
});

export function useTransactionHistory(
  userId: string | null,
  token: string | null,
  onUnauthorized: () => void,
) {
  const sessionKey = userId && token ? JSON.stringify([userId, token]) : null;
  const currentKey = useRef(sessionKey);
  const unauthorizedRef = useRef(onUnauthorized);
  useEffect(() => {
    currentKey.current = sessionKey;
    unauthorizedRef.current = onUnauthorized;
  });
  const requestRef = useRef<((offset: number) => void) | null>(null);
  const loadingRef = useRef(false);
  const [storedState, setState] = useState<HistoryViewState>(() => emptyState(sessionKey));
  const state = storedState.sessionKey === sessionKey ? storedState : emptyState(sessionKey);

  useEffect(() => {
    if (!sessionKey || !userId || !token) {
      requestRef.current = null;
      return;
    }

    const controller = new AbortController();
    const attemptedPlayers = new Set<string>();
    const isCurrent = () => !controller.signal.aborted && currentKey.current === sessionKey;
    const expire = () => {
      if (!isCurrent()) return;
      controller.abort();
      requestRef.current = null;
      setState(emptyState(null));
      unauthorizedRef.current();
    };

    const enrichPlayers = (items: TransactionHistoryItem[]) => {
      for (const playerId of new Set(items.map((item) => item.playerId))) {
        if (attemptedPlayers.has(playerId)) continue;
        attemptedPlayers.add(playerId);
        setState((previous) => previous.sessionKey === sessionKey ? {
          ...previous,
          players: { ...previous.players, [playerId]: { status: 'pending' } },
        } : previous);
        void getPlayer(token, playerId, controller.signal).then((player) => {
          if (!isCurrent()) return;
          setState((previous) => previous.sessionKey === sessionKey ? {
            ...previous,
            players: { ...previous.players, [playerId]: {
              status: 'resolved', name: player.name, team: player.team,
              league: player.league,
            } },
          } : previous);
        }).catch((error: unknown) => {
          if (!isCurrent()) return;
          if (error instanceof PlayerHttpError && error.status === 401) {
            expire();
            return;
          }
          setState((previous) => previous.sessionKey === sessionKey ? {
            ...previous,
            players: { ...previous.players, [playerId]: { status: 'unavailable' } },
          } : previous);
        });
      }
    };

    const request = (offset: number) => {
      if (!isCurrent() || loadingRef.current) return;
      loadingRef.current = true;
      setState((previous) => ({
        ...(previous.sessionKey === sessionKey ? previous : emptyState(sessionKey)),
        phase: offset === 0 ? 'initial-loading' : 'loading-more',
        error: null,
      }));
      void getTransactionHistory({ userId, token }, offset, controller.signal).then((response) => {
        if (!isCurrent()) return;
        setState((previous) => {
          if (previous.sessionKey !== sessionKey) return previous;
          const merged = mergeHistoryPage(previous.items, response);
          return {
            ...previous,
            ...merged,
            phase: merged.items.length === 0 ? 'empty' : 'content',
            error: null,
          };
        });
        enrichPlayers(response.items);
      }).catch((error: unknown) => {
        if (!isCurrent()) return;
        if (error instanceof HistoryHttpError && error.status === 401) {
          expire();
          return;
        }
        if (error instanceof HistoryHttpError && error.status === 403) {
          setState({ ...emptyState(sessionKey), phase: 'access-denied', error: 'No tenés acceso a este historial.' });
          return;
        }
        setState((previous) => previous.sessionKey === sessionKey ? {
          ...previous,
          phase: offset === 0 ? 'initial-error' : 'page-error',
          error: 'No se pudieron cargar las operaciones. Intentá de nuevo.',
        } : previous);
      }).finally(() => {
        if (isCurrent()) loadingRef.current = false;
      });
    };

    loadingRef.current = false;
    requestRef.current = request;
    request(0);
    return () => {
      controller.abort();
      requestRef.current = null;
      loadingRef.current = false;
    };
  }, [sessionKey, token, userId]);

  const loadMore = useCallback(() => {
    if (state.sessionKey !== currentKey.current || !state.hasMore ||
      (state.phase !== 'content' && state.phase !== 'page-error')) return;
    requestRef.current?.(state.nextOffset);
  }, [state]);

  const retry = useCallback(() => {
    if (state.sessionKey !== currentKey.current) return;
    if (state.phase === 'initial-error') requestRef.current?.(0);
    if (state.phase === 'page-error') requestRef.current?.(state.nextOffset);
  }, [state]);

  return { ...state, pageSize: HISTORY_PAGE_SIZE, loadMore, retry };
}
