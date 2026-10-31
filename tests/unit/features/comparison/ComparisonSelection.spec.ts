import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { League, Position } from '@/backend/models/enums';
import ComparisonSelection from '@/frontend/features/comparison/components/ComparisonSelection';
import type { ComparisonPlayer } from '@/frontend/features/comparison/comparison';

const player: ComparisonPlayer = {
  id: 'a',
  name: 'Jugador A',
  team: 'Equipo',
  league: League.LA_LIGA,
  position: Position.FORWARD,
  statistics: { rating: 8.95 },
  history: {
    phase: 'success',
    items: [
      { playerId: 'a', quoteValue: 128.4, unit: 'CREDIT_PER_TOKEN', calculatedAt: '2026-10-02', strategyCode: 'INDIVIDUAL_PERFORMANCE', strategyVersion: '1', score: { individualScore: 0.82, teamScore: null, finalScore: 0.8 } },
      { playerId: 'a', quoteValue: 120, unit: 'CREDIT_PER_TOKEN', calculatedAt: '2026-10-01', strategyCode: 'INDIVIDUAL_PERFORMANCE', strategyVersion: '1' },
    ],
    error: null,
    generation: 0,
  },
};

describe('ComparisonSelection', () => {
  it('shows three metrics, the profile action, and two available slots', () => {
    const html = renderToStaticMarkup(createElement(ComparisonSelection, {
      player,
      onRemove: () => {},
      onFocusSearch: () => {},
    }));

    expect(html).toContain('Jugador A');
    expect(html).toContain('128,40');
    expect(html).toContain('7%');
    expect(html).toContain('score final');
    expect(html.match(/Agregá un jugador/g)).toHaveLength(2);
    expect(html).toContain('href="/players/a"');
    expect(html).toContain('Quitar a Jugador A');
    expect(html).not.toContain('Comprar tokens');
    expect(html).not.toContain('Rend. individual');
  });
});
