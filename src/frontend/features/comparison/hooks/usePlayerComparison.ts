import { useCallback, useEffect, useRef, useState } from 'react';
import type { CatalogPlayer } from '@/frontend/features/catalog/player-catalog';
import {
  getPlayers,
  type PlayerHttpError,
} from '@/frontend/services/client/player.service';
import { getPlayerQuotes } from '@/frontend/services/client/player-quotes.service';
import { readLastComparison, saveLastComparison } from '@/frontend/features/comparison/comparison-storage';
import {
  addSelectedPlayer,
  emptyQuoteChannel,
  MAX_COMPARISON_PLAYERS,
  removeSelectedPlayer,
  type ComparisonPlayer,
  type QuoteChannel,
  type SearchState,
} from '@/frontend/features/comparison/comparison';

const SEARCH_LIMIT = 12;
const initialSearch: SearchState = {
  phase: 'idle',
  query: '',
  results: [],
  error: null,
};

export function usePlayerComparison(
  token: string | null,
  userId: string | null,
  onUnauthorized: () => void,
) {
  const [search, setSearch] = useState<SearchState>(initialSearch);
  const [selected, setSelected] = useState<CatalogPlayer[]>([]);
  const [histories, setHistories] = useState<Record<string, QuoteChannel>>({});
  const [restoredUserId, setRestoredUserId] = useState<string | null>(null);
  const restoredSession = useRef<string | null>(null);
  const searchGeneration = useRef(0);
  const historyGenerations = useRef<Record<string, number>>({});
  const unauthorized = useRef(onUnauthorized);

  useEffect(() => {
    unauthorized.current = onUnauthorized;
  }, [onUnauthorized]);

  const searchPlayers = useCallback(
    async (rawQuery: string) => {
      const query = rawQuery.trim();
      searchGeneration.current += 1;
      const generation = searchGeneration.current;

      if (!query || !token) {
        setSearch({ ...initialSearch, query });
        return;
      }

      const controller = new AbortController();
      setSearch({ phase: 'loading', query, results: [], error: null });

      try {
        const response = await getPlayers(
          token,
          { name: query, league: '', team: '', position: '' },
          1,
          controller.signal,
        );

        if (generation !== searchGeneration.current) return;

        setSearch({
          phase: response.data.length ? 'content' : 'empty',
          query,
          results: response.data.slice(0, SEARCH_LIMIT),
          error: null,
        });
      } catch (error) {
        if (controller.signal.aborted || generation !== searchGeneration.current) {
          return;
        }

        const status = (error as PlayerHttpError).status;
        if (status === 401) {
          unauthorized.current();
          return;
        }

        setSearch({
          phase: 'error',
          query,
          results: [],
          error:
            error instanceof Error
              ? error.message
              : 'No se pudieron buscar jugadores',
        });
      }
    },
    [token],
  );

  const loadHistory = useCallback(
    async (player: CatalogPlayer) => {
      if (!token) return;

      const generation = (historyGenerations.current[player.id] ?? 0) + 1;
      historyGenerations.current[player.id] = generation;
      const controller = new AbortController();

      setHistories((current) => ({
        ...current,
        [player.id]: {
          ...emptyQuoteChannel(generation),
          phase: 'loading',
        },
      }));

      try {
        const response = await getPlayerQuotes(
          token,
          player.id,
          undefined,
          controller.signal,
        );

        if (historyGenerations.current[player.id] !== generation) return;

        setHistories((current) => ({
          ...current,
          [player.id]: {
            phase: response.items.length ? 'success' : 'empty',
            items: response.items,
            error: null,
            generation,
          },
        }));
      } catch (error) {
        if (historyGenerations.current[player.id] !== generation) return;

        const status = (error as { status?: number }).status;
        if (status === 401) {
          unauthorized.current();
          return;
        }

        setHistories((current) => ({
          ...current,
          [player.id]: {
            ...emptyQuoteChannel(generation),
            phase: 'error',
            error:
              error instanceof Error
                ? error.message
                : 'No se pudieron cargar las cotizaciones',
          },
        }));
      }
    },
    [token],
  );

  useEffect(() => {
    if (!token || !userId || restoredSession.current === userId) return;
    restoredSession.current = userId;
    searchGeneration.current += 1;
    for (const id of Object.keys(historyGenerations.current)) {
      historyGenerations.current[id] += 1;
    }

    let restored: CatalogPlayer[] = [];
    try {
      restored = readLastComparison(window.localStorage, userId);
    } catch {
      // Storage may be unavailable in private browsing modes.
    }

    setSearch(initialSearch);
    setSelected(restored);
    setHistories({});
    restored.forEach((player) => void loadHistory(player));
    setRestoredUserId(userId);
  }, [token, userId, loadHistory]);

  useEffect(() => {
    if (!userId || restoredUserId !== userId) return;
    try {
      saveLastComparison(window.localStorage, userId, selected);
    } catch {
      // Keep the comparison usable when storage is unavailable.
    }
  }, [userId, restoredUserId, selected]);

  const addPlayer = useCallback(
    (player: CatalogPlayer) => {
      setSelected((current) => {
        if (
          current.length >= MAX_COMPARISON_PLAYERS ||
          current.some((item) => item.id === player.id)
        ) {
          return current;
        }

        void loadHistory(player);
        return addSelectedPlayer(current, player);
      });
    },
    [loadHistory],
  );

  const removePlayer = useCallback((playerId: string) => {
    historyGenerations.current[playerId] =
      (historyGenerations.current[playerId] ?? 0) + 1;
    setSelected((current) => removeSelectedPlayer(current, playerId));
    setHistories((current) => {
      const next = { ...current };
      delete next[playerId];
      return next;
    });
  }, []);

  const players: ComparisonPlayer[] = selected.map((player) => ({
    ...player,
    history: histories[player.id] ?? emptyQuoteChannel(),
  }));

  return {
    search,
    selected,
    players,
    isRestoring: userId !== restoredUserId,
    searchPlayers,
    addPlayer,
    removePlayer,
  };
}
