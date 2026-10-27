import { RANKING_PAGE_SIZE, type RankingResponse, type RankingSelection } from '@/frontend/features/ranking/ranking';

export class PlayerRankingHttpError extends Error {
  constructor(public readonly status: number) {
    super('No se pudo cargar el ranking');
    this.name = 'PlayerRankingHttpError';
  }
}

export async function getPlayerRanking(token: string, signal?: AbortSignal, selection: RankingSelection = { page: 1 }): Promise<RankingResponse> {
  const query = new URLSearchParams({ page: String(selection.page), limit: String(RANKING_PAGE_SIZE) });
  if (selection.league) query.set('league', selection.league);
  if (selection.team?.trim()) query.set('team', selection.team.trim());
  if (selection.position) query.set('position', selection.position);
  let response: Response;
  try {
    response = await fetch(`/api/players/ranking?${query}`, {
      headers: { Authorization: `Bearer ${token}` }, signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new PlayerRankingHttpError(0);
  }
  if (!response.ok) throw new PlayerRankingHttpError(response.status);
  try {
    return await response.json() as RankingResponse;
  } catch {
    throw new PlayerRankingHttpError(0);
  }
}
