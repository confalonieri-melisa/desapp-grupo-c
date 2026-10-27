import { describe, expect, it } from 'vitest';
import { League, Position } from '@/backend/models/enums';
import { parseRankingSelection, serializeRankingSelection } from '@/frontend/features/ranking/utils/ranking-url';

describe('ranking URL selection', () => {
  it('reads supported filters and a positive page', () => {
    expect(parseRankingSelection(new URLSearchParams('league=LA_LIGA&team=++Real+&position=FORWARD&page=3'))).toEqual({
      league: League.LA_LIGA, team: 'Real', position: Position.FORWARD, page: 3,
    });
  });

  it('ignores unknown enums, unrelated params and invalid pages', () => {
    expect(parseRankingSelection(new URLSearchParams('league=BAD&position=BAD&page=0&name=Messi&limit=100'))).toEqual({ page: 1 });
    expect(parseRankingSelection(new URLSearchParams('page=abc&team=+++'))).toEqual({ page: 1 });
  });

  it('serializes only active filters, preserving them on later pages', () => {
    const selection = { league: League.BUNDESLIGA, team: ' Schalke ', position: Position.DEFENDER, page: 2 };
    expect(serializeRankingSelection(selection)).toBe('league=BUNDESLIGA&team=Schalke&position=DEFENDER&page=2');
    expect(serializeRankingSelection({ ...selection, page: 1 })).toBe('league=BUNDESLIGA&team=Schalke&position=DEFENDER');
    expect(serializeRankingSelection({ page: 1 })).toBe('');
  });
});
