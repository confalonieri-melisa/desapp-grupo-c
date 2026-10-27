import { beforeEach, describe, expect, it, vi } from 'vitest';
import { League, Position } from '@/backend/models/enums';
import type { RankingResponse } from '@/frontend/features/ranking/ranking';
import { createHookHarness, deferred, flushPromises } from '../profile/hook-harness';

const mocks = vi.hoisted(() => ({ ranking: vi.fn(), harness: null as ReturnType<typeof createHookHarness> | null }));
vi.mock('react', () => ({
  useState: (...args: Parameters<ReturnType<typeof createHookHarness>['useState']>) => mocks.harness!.useState(...args),
  useRef: (...args: Parameters<ReturnType<typeof createHookHarness>['useRef']>) => mocks.harness!.useRef(...args),
  useEffect: (...args: Parameters<ReturnType<typeof createHookHarness>['useEffect']>) => mocks.harness!.useEffect(...args),
}));
vi.mock('@/frontend/services/client/player-ranking.service', async (original) => ({
  ...await original<object>(), getPlayerRanking: mocks.ranking,
}));

import { usePlayerRanking } from '@/frontend/features/ranking/hooks/usePlayerRanking';
import { PlayerRankingHttpError } from '@/frontend/services/client/player-ranking.service';

const empty: RankingResponse = {
  strategyCode: 'INDIVIDUAL_PERFORMANCE', strategyVersion: '1.0.0', players: [],
  pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
};
const populated: RankingResponse = { ...empty, players: [{
  rank: 1, player: { id: 'a', name: 'Ana', team: 'Arsenal', league: League.PREMIER_LEAGUE, position: Position.FORWARD },
  finalScore: 0.9, quoteValue: 90, unit: 'CREDIT_PER_TOKEN', calculatedAt: '2026-10-26T12:00:00Z',
}], pagination: { total: 1, page: 1, limit: 20, totalPages: 1 } };

describe('usePlayerRanking', () => {
  const onUnauthorized = vi.fn();
  const render = (token: string | null = 'token', page = 1) => mocks.harness!.render(() => usePlayerRanking(token, { page }, onUnauthorized));

  beforeEach(() => {
    mocks.harness = createHookHarness();
    mocks.ranking.mockReset();
    onUnauthorized.mockReset();
  });

  it('shows empty only after a successful empty response and retries a failed selection', async () => {
    mocks.ranking.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(empty);
    expect(render().phase).toBe('loading');
    mocks.harness!.commit(); await flushPromises();
    expect(render().phase).toBe('error');
    render().retry();
    expect(render().phase).toBe('loading');
    mocks.harness!.commit(); await flushPromises();
    expect(render().phase).toBe('empty');
    expect(mocks.ranking).toHaveBeenCalledTimes(2);
  });

  it('separates missing strategy from empty and clears the view on 401', async () => {
    mocks.ranking.mockRejectedValueOnce(new PlayerRankingHttpError(409)).mockRejectedValueOnce(new PlayerRankingHttpError(401));
    render(); mocks.harness!.commit(); await flushPromises();
    expect(render().phase).toBe('no-active-strategy');
    render().retry();
    expect(render().phase).toBe('loading');
    mocks.harness!.commit(); await flushPromises();
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(render(null).phase).toBe('unauthenticated');
    expect(render(null).data).toBeNull();
  });

  it('drops late results after page and session changes', async () => {
    const old = deferred<RankingResponse>();
    mocks.ranking.mockReturnValueOnce(old.promise).mockResolvedValue(empty);
    render(); mocks.harness!.commit();
    expect(render('token', 2).phase).toBe('loading');
    mocks.harness!.commit(); await flushPromises();
    old.resolve(populated); await flushPromises();
    expect(render('token', 2).phase).toBe('empty');
    expect(render('other', 2).data).toBeNull();
    mocks.harness!.commit();
    expect(mocks.ranking.mock.calls[0][1].aborted).toBe(true);
  });

  it('removes a previous session result before a new token receives 401', async () => {
    mocks.ranking.mockResolvedValueOnce(populated).mockRejectedValueOnce(new PlayerRankingHttpError(401));
    render('token-a'); mocks.harness!.commit(); await flushPromises();
    expect(render('token-a').data?.players).toHaveLength(1);
    expect(render('token-b').data).toBeNull();
    mocks.harness!.commit(); await flushPromises();
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(render(null).data).toBeNull();
  });
});
