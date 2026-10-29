import { RANKING_PAGE_SIZE, type RankingResponse, type RankingSelection } from '@/frontend/features/ranking/ranking';

export class PlayerRankingHttpError extends Error {
  constructor(public readonly status: number) {
    super('No se pudo cargar el ranking');
    this.name = 'PlayerRankingHttpError';
  }
}

const DEFAULT_RANKING_SELECTION: RankingSelection = { page: 1 };

export async function getPlayerRanking(token: string, signal?: AbortSignal, selection?: RankingSelection): Promise<RankingResponse> {
  const currentSelection = selection ?? DEFAULT_RANKING_SELECTION;
  const query = new URLSearchParams({ page: String(currentSelection.page), limit: String(RANKING_PAGE_SIZE) });
  if (currentSelection.league) query.set('league', currentSelection.league);
  if (currentSelection.team?.trim()) query.set('team', currentSelection.team.trim());
  if (currentSelection.position) query.set('position', currentSelection.position);
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
