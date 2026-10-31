// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { League, Position } from '@/backend/models/enums';
import type { CatalogPlayer } from '@/frontend/features/catalog/player-catalog';
import { usePlayerComparison } from '@/frontend/features/comparison/hooks/usePlayerComparison';

const player = (id: string): CatalogPlayer => ({
  id,
  name: `Jugador ${id}`,
  team: 'Equipo',
  league: League.LA_LIGA,
  position: Position.FORWARD,
  statistics: {},
});

const catalog = (players: CatalogPlayer[]) => Response.json({
  data: players,
  pagination: { total: players.length, page: 1, limit: 12, totalPages: 1 },
});

const quotes = (id: string, values: number[] = [12, 10]) => Response.json({
  items: values.map((quoteValue, index) => ({
    playerId: id,
    quoteValue,
    unit: 'CREDIT_PER_TOKEN',
    calculatedAt: `2026-10-0${index + 1}`,
    strategyCode: 'TEST',
    strategyVersion: '1',
  })),
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('usePlayerComparison', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('restores a user selection and loads its real quotes', async () => {
    window.localStorage.setItem('player-comparison:v1:user-a', JSON.stringify([player('a')]));
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(quotes('a'));
    const { result } = renderHook(() => usePlayerComparison('token', 'user-a', vi.fn()));

    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    await waitFor(() => expect(result.current.players[0].history.phase).toBe('success'));
    expect(result.current.players[0].history.items.map((item) => item.quoteValue)).toEqual([12, 10]);
    expect(fetchMock).toHaveBeenCalledWith('/api/players/a/quotes', expect.objectContaining({
      headers: { Authorization: 'Bearer token' },
    }));
  });

  it('searches by trimmed name, caps results and discards a stale response', async () => {
    const oldRequest = deferred<Response>();
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => oldRequest.promise)
      .mockResolvedValueOnce(catalog(Array.from({ length: 15 }, (_, index) => player(String(index)))));
    const { result } = renderHook(() => usePlayerComparison('token', 'user-a', vi.fn()));
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    await act(async () => { void result.current.searchPlayers(' primero '); });
    expect(result.current.search.phase).toBe('loading');
    await act(async () => { await result.current.searchPlayers(' segundo '); });
    expect(result.current.search.phase).toBe('content');
    expect(result.current.search.results).toHaveLength(12);
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/players?page=1&limit=12&name=segundo', expect.any(Object));

    await act(async () => { oldRequest.resolve(catalog([player('stale')])); });
    expect(result.current.search.results[0].id).toBe('0');
    await act(async () => { await result.current.searchPlayers('   '); });
    expect(result.current.search.phase).toBe('idle');
  });

  it('handles empty searches, failures and expired authorization', async () => {
    const onUnauthorized = vi.fn();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(catalog([]))
      .mockRejectedValueOnce(new Error('Sin red'))
      .mockResolvedValueOnce(Response.json({ error: 'expired' }, { status: 401 }));
    const { result } = renderHook(() => usePlayerComparison('token', 'user-a', onUnauthorized));
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    await act(async () => { await result.current.searchPlayers('nadie'); });
    expect(result.current.search.phase).toBe('empty');
    await act(async () => { await result.current.searchPlayers('error'); });
    expect(result.current.search).toMatchObject({ phase: 'error', error: 'Sin red' });
    await act(async () => { await result.current.searchPlayers('expired'); });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('limits selection, saves it per user and removes one player', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const id = String(url).split('/')[3];
      return quotes(id, id === 'b' ? [] : [12, 10]);
    });
    const { result } = renderHook(() => usePlayerComparison('token', 'user-a', vi.fn()));
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    act(() => {
      for (const id of ['a', 'b', 'c', 'd', 'a']) result.current.addPlayer(player(id));
    });
    await waitFor(() => expect(result.current.players.map((item) => item.history.phase)).toEqual(['success', 'empty', 'success']));
    expect(result.current.selected.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(JSON.parse(window.localStorage.getItem('player-comparison:v1:user-a') ?? '[]')).toHaveLength(3);

    act(() => result.current.removePlayer('b'));
    expect(result.current.players.map((item) => item.id)).toEqual(['a', 'c']);
    expect(window.localStorage.getItem('player-comparison:v1:user-b')).toBeNull();
  });

  it('ignores quotes received after removal and preserves another player on error', async () => {
    const pending = deferred<Response>();
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (String(url).includes('/a/')) return pending.promise;
      return Promise.resolve(Response.json({ error: 'Quotes failed' }, { status: 500 }));
    });
    const { result } = renderHook(() => usePlayerComparison('token', 'user-a', vi.fn()));
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    act(() => { result.current.addPlayer(player('a')); result.current.addPlayer(player('b')); });
    await waitFor(() => expect(result.current.players.find((item) => item.id === 'b')?.history.phase).toBe('error'));
    expect(result.current.players.find((item) => item.id === 'b')?.history.error).toBe('Quotes failed');
    act(() => result.current.removePlayer('a'));
    await act(async () => { pending.resolve(quotes('a')); });
    expect(result.current.players.map((item) => item.id)).toEqual(['b']);
  });

  it('invokes logout handling when quote loading returns 401', async () => {
    const onUnauthorized = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ error: 'expired' }, { status: 401 }));
    const { result } = renderHook(() => usePlayerComparison('token', 'user-a', onUnauthorized));
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    act(() => result.current.addPlayer(player('a')));
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledOnce());
  });
});
