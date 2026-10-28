import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TransactionHistoryItem, TransactionHistoryResponse } from '@/frontend/features/history/history';

const mocks = vi.hoisted(() => ({
  history: vi.fn(), player: vi.fn(), effects: [] as Array<() => void | (() => void)>,
  states: [] as unknown[], refs: [] as Array<{ current: unknown }>,
  stateIndex: 0, refIndex: 0,
}));

vi.mock('react', () => ({
  useEffect: (effect: () => void | (() => void)) => { mocks.effects.push(effect); },
  useRef: (initial: unknown) => {
    const index = mocks.refIndex++;
    mocks.refs[index] ??= { current: initial };
    return mocks.refs[index];
  },
  useState: (initial: unknown) => {
    const index = mocks.stateIndex++;
    mocks.states[index] ??= typeof initial === 'function' ? (initial as () => unknown)() : initial;
    return [mocks.states[index], (value: unknown) => {
      mocks.states[index] = typeof value === 'function' ? (value as (state: unknown) => unknown)(mocks.states[index]) : value;
    }];
  },
  useCallback: (callback: unknown) => callback,
}));

vi.mock('@/frontend/services/client/transaction-history.service', async (importOriginal) => ({
  ...await importOriginal<object>(), getTransactionHistory: mocks.history,
}));
vi.mock('@/frontend/services/client/player.service', async (importOriginal) => ({
  ...await importOriginal<object>(), getPlayer: mocks.player,
}));

import { useTransactionHistory } from '@/frontend/features/history/hooks/useTransactionHistory';
import { HistoryHttpError } from '@/frontend/services/client/transaction-history.service';
import { PlayerHttpError } from '@/frontend/services/client/player.service';

const item = (id: string, playerId = 'p'): TransactionHistoryItem => ({
  id, type: 'BUY', playerId, quantity: 1, quoteId: 'q', quoteValue: 2,
  total: 2, unit: 'CREDIT_PER_TOKEN', createdAt: '2026-10-26T00:00:00Z', correlationId: null,
});
const page = (items: TransactionHistoryItem[], offset: number, hasMore: boolean): TransactionHistoryResponse =>
  ({ items, limit: 20, offset, hasMore });
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('useTransactionHistory', () => {
  let cleanup: void | (() => void);
  let unauthorized: ReturnType<typeof vi.fn<() => void>>;

  const useRenderHistory = (userId: string | null = 'a', token: string | null = 'token') => {
    mocks.stateIndex = 0;
    mocks.refIndex = 0;
    mocks.effects.length = 0;
    return useTransactionHistory(userId, token, unauthorized);
  };
  const activate = () => {
    cleanup?.();
    mocks.effects[0]();
    cleanup = mocks.effects[1]();
  };

  beforeEach(() => {
    cleanup?.();
    cleanup = undefined;
    mocks.history.mockReset();
    mocks.player.mockReset().mockResolvedValue({ name: 'Jugador' });
    mocks.states.length = 0;
    mocks.refs.length = 0;
    unauthorized = vi.fn();
  });

  it('loads offset zero, appends unique rows, advances by response length, and stops at the final page', async () => {
    mocks.history.mockResolvedValueOnce(page([item('a'), item('b')], 0, true))
      .mockResolvedValueOnce(page([item('b'), item('c')], 2, false));
    useRenderHistory(); activate(); await flush();
    expect(mocks.history).toHaveBeenCalledWith({ userId: 'a', token: 'token' }, 0, expect.any(AbortSignal));
    let result = useRenderHistory();
    expect(result.items.map(({ id }) => id)).toEqual(['a', 'b']);
    result.loadMore(); result.loadMore();
    expect(mocks.history).toHaveBeenCalledTimes(2);
    await flush(); result = useRenderHistory();
    expect(result.items.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    expect(result.nextOffset).toBe(4);
    expect(result.hasMore).toBe(false);
    result.loadMore();
    expect(mocks.history).toHaveBeenCalledTimes(2);
    expect(mocks.player).toHaveBeenCalledTimes(1);
  });

  it('retries the failed later offset without clearing earlier rows', async () => {
    mocks.history.mockResolvedValueOnce(page([item('a')], 0, true))
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(page([item('b')], 1, false));
    useRenderHistory(); activate(); await flush();
    useRenderHistory().loadMore(); await flush();
    let result = useRenderHistory();
    expect(result.phase).toBe('page-error');
    expect(result.items.map(({ id }) => id)).toEqual(['a']);
    result.retry(); await flush(); result = useRenderHistory();
    expect(mocks.history.mock.calls.map((call) => call[1])).toEqual([0, 1, 1]);
    expect(result.items.map(({ id }) => id)).toEqual(['a', 'b']);
  });

  it('keeps an initial error distinct from an empty successful response and retries offset zero', async () => {
    mocks.history.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(page([], 0, false));
    useRenderHistory(); activate(); await flush();
    expect(useRenderHistory().phase).toBe('initial-error');
    useRenderHistory().retry(); await flush();
    expect(useRenderHistory().phase).toBe('empty');
    expect(mocks.history.mock.calls.map((call) => call[1])).toEqual([0, 0]);
  });

  it('clears protected data for 403 and expires on player 401', async () => {
    mocks.history.mockRejectedValueOnce(new HistoryHttpError('forbidden', 403));
    useRenderHistory(); activate(); await flush();
    expect(useRenderHistory()).toMatchObject({ phase: 'access-denied', items: [] });
    cleanup?.(); cleanup = undefined;
    mocks.states.length = 0; mocks.refs.length = 0;
    mocks.history.mockResolvedValue(page([item('a')], 0, false));
    mocks.player.mockRejectedValue(new PlayerHttpError('expired', 401));
    useRenderHistory(); activate(); await flush();
    expect(unauthorized).toHaveBeenCalledOnce();
    expect(useRenderHistory().items).toEqual([]);
  });

  it('expires on history 401 and aborts the active session request', async () => {
    mocks.history.mockRejectedValue(new HistoryHttpError('expired', 401));
    useRenderHistory(); activate();
    const signal = mocks.history.mock.calls[0][2] as AbortSignal;
    await flush();
    expect(unauthorized).toHaveBeenCalledOnce();
    expect(signal.aborted).toBe(true);
    expect(useRenderHistory().items).toEqual([]);
  });

  it('keeps rows with an unresolved player and aborts on unmount', async () => {
    mocks.history.mockResolvedValue(page([item('a', 'missing')], 0, false));
    mocks.player.mockRejectedValue(new PlayerHttpError('missing', 404));
    useRenderHistory(); activate(); await flush();
    expect(useRenderHistory().players.missing).toEqual({ status: 'unavailable' });
    expect(useRenderHistory().items.map(({ id }) => id)).toEqual(['a']);
    const signal = mocks.history.mock.calls[0][2] as AbortSignal;
    cleanup?.(); cleanup = undefined;
    expect(signal.aborted).toBe(true);
  });

  it('rejects delayed results from session A after switching to B', async () => {
    const late = deferred<TransactionHistoryResponse>();
    mocks.history.mockReturnValueOnce(late.promise).mockResolvedValueOnce(page([item('b')], 0, false));
    useRenderHistory('a', 'a-token'); activate();
    expect(useRenderHistory('b', 'b-token').items).toEqual([]);
    activate(); await flush();
    late.resolve(page([item('a')], 0, false)); await flush();
    const result = useRenderHistory('b', 'b-token');
    expect(result.items.map(({ id }) => id)).toEqual(['b']);
    expect(mocks.history.mock.calls.map((call) => call[0].userId)).toEqual(['a', 'b']);
  });
});
