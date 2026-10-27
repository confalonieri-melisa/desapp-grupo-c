import { afterEach, describe, expect, it, vi } from 'vitest';
import { League, Position } from '@/backend/models/enums';
import { getPlayerRanking, PlayerRankingHttpError } from '@/frontend/services/client/player-ranking.service';

describe('player ranking client', () => {
  afterEach(() => vi.restoreAllMocks());

  it('requests the active ranking with bearer auth and preserves order and metadata', async () => {
    const response = {
      strategyCode: 'INDIVIDUAL_PERFORMANCE', strategyVersion: '1.0.0',
      players: [
        { rank: 1, player: { id: 'a', name: 'Ana', team: 'Arsenal', league: League.PREMIER_LEAGUE, position: Position.FORWARD }, finalScore: 0.8, quoteValue: 83.5, unit: 'CREDIT_PER_TOKEN', calculatedAt: '2026-10-26T12:00:00Z' },
        { rank: 2, player: { id: 'b', name: 'Bea', team: 'Arsenal', league: League.PREMIER_LEAGUE, position: Position.FORWARD }, finalScore: 0.8, quoteValue: 80, unit: 'CREDIT_PER_TOKEN', calculatedAt: '2026-10-26T12:00:00Z' },
      ],
      pagination: { total: 2, page: 1, limit: 20, totalPages: 1 },
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(response)));
    const controller = new AbortController();

    await expect(getPlayerRanking('secret', controller.signal)).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith('/api/players/ranking?page=1&limit=20', {
      headers: { Authorization: 'Bearer secret' }, signal: controller.signal,
    });
  });

  it('sends only supported filters and keeps the backend ranks on a later page', async () => {
    const page = {
      strategyCode: 'INDIVIDUAL_PERFORMANCE', strategyVersion: '1.0.0',
      players: [{ rank: 21, player: { id: 'a', name: 'Ana', team: 'Schalke', league: League.BUNDESLIGA, position: Position.DEFENDER }, finalScore: 0.75, quoteValue: 70, unit: 'CREDIT_PER_TOKEN', calculatedAt: '2026-10-26T12:00:00Z' }],
      pagination: { total: 21, page: 2, limit: 20, totalPages: 2 },
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(page)));
    await expect(getPlayerRanking('secret', undefined, {
      league: League.BUNDESLIGA, team: ' Schal ', position: Position.DEFENDER, page: 2,
    })).resolves.toEqual(page);
    expect(fetchMock).toHaveBeenCalledWith('/api/players/ranking?page=2&limit=20&league=BUNDESLIGA&team=Schal&position=DEFENDER', {
      headers: { Authorization: 'Bearer secret' }, signal: undefined,
    });
  });

  it.each([400, 401, 409, 500])('preserves HTTP status %i without treating errors as an empty ranking', async (status) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"error":"internal detail"}', { status }));
    await expect(getPlayerRanking('secret')).rejects.toMatchObject({ status, message: 'No se pudo cargar el ranking' });
    await expect(getPlayerRanking('secret')).rejects.toBeInstanceOf(PlayerRankingHttpError);
  });

  it('keeps a network failure recoverable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network unavailable'));
    await expect(getPlayerRanking('secret')).rejects.toMatchObject({ status: 0, message: 'No se pudo cargar el ranking' });
  });
});
