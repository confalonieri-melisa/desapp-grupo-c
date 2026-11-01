import { describe, expect, it } from 'vitest';
import { buildQuoteSeries } from '@/frontend/features/comparison/comparison';
import type { ComparisonPlayer } from '@/frontend/features/comparison/comparison';
import { League, Position } from '@/backend/models/enums';

const player = (items: ComparisonPlayer['history']['items']): ComparisonPlayer => ({ id: 'a', name: 'Jugador A', team: 'Equipo', league: League.LA_LIGA, position: Position.FORWARD, statistics: {}, currentQuote: 1, totalTokens: 100, history: { phase: items.length ? 'success' : 'empty', items, error: null, generation: 0 } });

describe('ComparisonChart data', () => {
  it('requires two real points and preserves the chronological values', () => {
    const series = buildQuoteSeries(player([
      { playerId: 'a', quoteValue: 12, unit: 'CREDIT_PER_TOKEN', calculatedAt: '2026-10-02', strategyCode: 'TEST', strategyVersion: '1' },
      { playerId: 'a', quoteValue: 10, unit: 'CREDIT_PER_TOKEN', calculatedAt: '2026-10-01', strategyCode: 'TEST', strategyVersion: '1' },
    ]));
    expect(series.points.map((point) => point.value)).toEqual([10, 12]);
    expect(series.phase).toBe('ready');
    expect(buildQuoteSeries(player([])).phase).toBe('insufficient');
  });
});
