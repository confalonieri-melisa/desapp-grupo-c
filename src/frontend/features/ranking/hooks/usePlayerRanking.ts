import { useEffect, useRef, useState } from 'react';
import type { RankingResponse, RankingSelection } from '@/frontend/features/ranking/ranking';
import { getPlayerRanking, PlayerRankingHttpError } from '@/frontend/services/client/player-ranking.service';

type RankingPhase = 'loading' | 'content' | 'empty' | 'error' | 'no-active-strategy' | 'unauthenticated';
interface RankingState {
  sessionKey: string | null;
  requestKey: string | null;
  phase: RankingPhase;
  data: RankingResponse | null;
  error: string | null;
}

const initialState = (token: string | null, requestKey: string | null): RankingState => ({
  sessionKey: token,
  requestKey,
  phase: token ? 'loading' : 'unauthenticated',
  data: null,
  error: null,
});

export function usePlayerRanking(token: string | null, selection: RankingSelection, onUnauthorized: () => void) {
  const { league, team, position, page } = selection;
  const [retryVersion, setRetryVersion] = useState(0);
  const requestKey = token ? JSON.stringify([token, league ?? '', team ?? '', position ?? '', page, retryVersion]) : null;
  const [stored, setStored] = useState<RankingState>(() => initialState(token, requestKey));
  const activeRequest = useRef<string | null>(null);
  const state = stored.requestKey === requestKey ? stored : initialState(token, requestKey);

  useEffect(() => {
    if (!token || !requestKey) {
      activeRequest.current = null;
      return;
    }
    const controller = new AbortController();
    activeRequest.current = requestKey;
    const isCurrent = () => !controller.signal.aborted && activeRequest.current === requestKey;

    void getPlayerRanking(token, controller.signal, { league, team, position, page }).then((data) => {
      if (!isCurrent()) return;
      setStored({ sessionKey: token, requestKey, phase: data.players.length ? 'content' : 'empty', data, error: null });
    }).catch((error: unknown) => {
      if (!isCurrent()) return;
      if (error instanceof PlayerRankingHttpError && error.status === 401) {
        controller.abort();
        activeRequest.current = null;
        setStored(initialState(null, null));
        onUnauthorized();
        return;
      }
      setStored({
        sessionKey: token, requestKey,
        phase: error instanceof PlayerRankingHttpError && error.status === 409 ? 'no-active-strategy' : 'error',
        data: null,
        error: error instanceof PlayerRankingHttpError && error.status === 409
          ? 'No hay una estrategia de valuación activa.'
          : 'No se pudo cargar el ranking. Intentá de nuevo.',
      });
    });

    return () => {
      controller.abort();
      if (activeRequest.current === requestKey) activeRequest.current = null;
    };
  }, [token, requestKey, league, team, position, page, onUnauthorized]);

  const retry = () => {
    if (token && (state.phase === 'error' || state.phase === 'no-active-strategy')) {
      setRetryVersion((version) => version + 1);
    }
  };

  return { ...state, retry };
}
