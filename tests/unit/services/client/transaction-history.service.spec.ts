import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTransactionHistory, HistoryHttpError } from '@/frontend/services/client/transaction-history.service';
import { getPlayer, PlayerHttpError } from '@/frontend/services/client/player.service';

describe('transaction history client', () => {
  afterEach(() => vi.restoreAllMocks());

  it('requests the session user with bearer auth and preserves historical amounts', async () => {
    const page = { items: [{ quoteValue: 1.25, total: 3.75, unit: 'CREDIT_PER_TOKEN' }], limit: 20, offset: 0, hasMore: false };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(page)));
    await expect(getTransactionHistory({ userId: 'user-a', token: 'secret' }, 0)).resolves.toEqual(page);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users/user-a/transactions?limit=20&offset=0',
      { headers: { Authorization: 'Bearer secret' }, signal: undefined },
    );
  });

  it.each([401, 403, 404, 500])('preserves HTTP status %i for history errors', async (status) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status }));
    await expect(getTransactionHistory({ userId: 'a', token: 't' }, 20)).rejects.toMatchObject({ status });
  });

  it('uses a recoverable fallback on a non-JSON response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('oops', { status: 500 }));
    await expect(getTransactionHistory({ userId: 'a', token: 't' }, 0)).rejects.toBeInstanceOf(HistoryHttpError);
  });

  it.each([401, 404, 500])('preserves player HTTP status %i', async (status) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status }));
    await expect(getPlayer('t', 'p')).rejects.toMatchObject({ status });
    await expect(getPlayer('t', 'p')).rejects.toBeInstanceOf(PlayerHttpError);
  });
});
