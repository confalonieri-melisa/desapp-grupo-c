import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { League, Position } from '@/backend/models/enums';
import ComparisonMatrix from '@/frontend/features/comparison/components/ComparisonMatrix';
import type { ComparisonPlayer } from '@/frontend/features/comparison/comparison';

const render = (players: ComparisonPlayer[]) => renderToStaticMarkup(createElement(ComparisonMatrix, { players, onRemove: () => {} }));
const player = (id: string): ComparisonPlayer => ({ id, name: `Jugador ${id}`, team: 'Equipo', league: League.LA_LIGA, position: Position.FORWARD, statistics: {}, currentQuote: 1, totalTokens: 100, history: { phase: 'success', items: [{ playerId: id, quoteValue: 10, unit: 'CREDIT_PER_TOKEN', calculatedAt: '2026-10-02', strategyCode: 'TEST', strategyVersion: '1', score: { individualScore: 0.8, teamScore: null, finalScore: 0.7 } }, { playerId: id, quoteValue: 9, unit: 'CREDIT_PER_TOKEN', calculatedAt: '2026-10-01', strategyCode: 'TEST', strategyVersion: '1' }], error: null, generation: 0 } });

describe('ComparisonMatrix', () => {
  it('renders the five requested rows and one identity column per player', () => {
    const html = render([player('a'), player('b')]);
    expect(html).toContain('Cotización actual');
    expect(html).toContain('Variación desde la última cotización');
    expect(html).toContain('Score individual');
    expect(html).toContain('Score colectivo');
    expect(html).toContain('Score final');
    expect(html).toContain('Quitar a Jugador a');
    expect(html).toContain('No disponible');
  });
});
