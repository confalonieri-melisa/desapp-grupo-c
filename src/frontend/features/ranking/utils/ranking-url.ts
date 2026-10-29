import { isOfficialLeague, isPosition } from '@/backend/models/enums';
import type { RankingSelection } from '@/frontend/features/ranking/ranking';

export function parseRankingSelection(params: URLSearchParams): RankingSelection {
  const league = params.get('league');
  const position = params.get('position');
  const team = params.get('team')?.trim();
  const rawPage = Number(params.get('page'));
  const page = Number.isSafeInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  return {
    ...(isOfficialLeague(league) ? { league } : {}),
    ...(team ? { team } : {}),
    ...(isPosition(position) ? { position } : {}),
    page,
  };
}

export function serializeRankingSelection(selection: RankingSelection): string {
  const params = new URLSearchParams();
  if (selection.league) params.set('league', selection.league);
  if (selection.team?.trim()) params.set('team', selection.team.trim());
  if (selection.position) params.set('position', selection.position);
  if (selection.page > 1) params.set('page', String(selection.page));
  return params.toString();
}
