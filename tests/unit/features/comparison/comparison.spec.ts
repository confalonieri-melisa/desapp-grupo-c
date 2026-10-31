import { describe, expect, it } from 'vitest';
import type { PlayerQuoteDto } from '@/frontend/services/client/player-quotes.service';
import { League, Position } from '@/backend/models/enums';
import { addSelectedPlayer, buildComparisonRows, buildQuoteSeries, calculateQuoteVariation, formatComparisonValue, removeSelectedPlayer, type ComparisonPlayer } from '@/frontend/features/comparison/comparison';

const player = (id: string): ComparisonPlayer => ({ id, name: `Jugador ${id}`, team: 'Equipo', league: League.LA_LIGA, position: Position.FORWARD, statistics: {}, currentQuote: 1, totalTokens: 100, history: { phase: 'success', items: [], error: null, generation: 0 } });
const quote = (value: number, date: string, teamScore: number | null = 0.7): PlayerQuoteDto => ({ playerId: 'a', quoteValue: value, unit: 'CREDIT_PER_TOKEN', calculatedAt: date, strategyCode: 'TEST', strategyVersion: '1', score: { individualScore: 0.8, teamScore, finalScore: 0.75 } });

describe('comparison derivations', () => {
  it('adds without duplicates and enforces three players', () => {
    const one = player('1');
    const selected = addSelectedPlayer([one], one);
    const full = ['2', '3', '4'].map(player).reduce(addSelectedPlayer, [one]);
    expect(selected).toHaveLength(1);
    expect(full.map((item) => item.id)).toEqual(['1', '2', '3']);
  });

  it('removes only the requested player', () => expect(removeSelectedPlayer(['a', 'b', 'c'].map(player), 'b').map((item) => item.id)).toEqual(['a', 'c']));

  it('calculates percentage variation from the two newest records', () => expect(calculateQuoteVariation([quote(110, '2026-10-02'), quote(100, '2026-10-01')])).toBe(10));

  it('shows normalized scores on a 0 to 100 scale and keeps quote precision', () => {
    expect(formatComparisonValue(0.8, 'individualScore')).toBe('80');
    expect(formatComparisonValue(0.825, 'finalScore')).toBe('82,5');
    expect(formatComparisonValue(128.4, 'currentQuote')).toBe('128,40');
    expect(formatComparisonValue(null, 'teamScore')).toBe('No disponible');
  });

  it('builds exactly the five requested rows and preserves missing scores', () => {
    const current = player('a');
    current.history.items = [quote(110, '2026-10-02', null), quote(100, '2026-10-01', null)];
    expect(buildComparisonRows([current]).map((row) => row.key)).toEqual(['currentQuote', 'variation', 'individualScore', 'teamScore', 'finalScore']);
    expect(buildComparisonRows([current])[3].values).toEqual([null]);
  });

  it('sorts series chronologically and keeps only the 15 newest points', () => {
    const current = player('a');
    current.history.items = Array.from({ length: 17 }, (_, index) => quote(index + 1, `2026-10-${String(index + 1).padStart(2, '0')}`)).reverse();
    const series = buildQuoteSeries(current);
    expect(series.points).toHaveLength(15);
    expect(series.points[0].value).toBe(3);
    expect(series.points.at(-1)?.value).toBe(17);
    expect(series.phase).toBe('ready');
  });
});
