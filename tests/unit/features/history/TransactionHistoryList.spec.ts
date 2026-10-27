import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import TransactionHistoryList from '@/frontend/features/history/components/TransactionHistoryList';
import type { TransactionHistoryItem } from '@/frontend/features/history/history';
import { League } from '@/backend/models/enums';

vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: string }) =>
  createElement('a', { href }, children) }));

const items: TransactionHistoryItem[] = [
  { id: 'buy', type: 'BUY', playerId: 'player-a', quantity: 2, quoteId: 'q', quoteValue: 1234.5, total: 2469, unit: 'CREDIT_PER_TOKEN', createdAt: '2026-10-26T01:30:00.000Z', correlationId: null },
  { id: 'sell', type: 'SELL', playerId: 'missing', quantity: 1, quoteId: 'q2', quoteValue: 5, total: 5, unit: 'OTHER_UNIT', createdAt: '2026-10-26T02:30:00.000Z', correlationId: null },
];

describe('TransactionHistoryList', () => {
  it('shows purchase and sale labels with saved values, a resolved link, and an ID-only fallback', () => {
    const html = renderToStaticMarkup(createElement(TransactionHistoryList, {
      items, players: { 'player-a': { status: 'resolved', name: 'Raphinha', team: 'Barcelona', league: League.LA_LIGA }, missing: { status: 'unavailable' } },
    }));
    expect(html).toContain('Compra');
    expect(html).toContain('Venta');
    expect(html).toContain('href="/players/player-a"');
    expect(html).toContain('Raphinha');
    expect(html).toContain('Barcelona');
    expect(html).toContain('La Liga');
    expect(html).toContain('Imagen de Raphinha');
    expect(html).toMatch(/assets%2Fplayers%2F[1-6]\.png/);
    expect(html).toContain('missing');
    expect(html).not.toContain('href="/players/missing"');
    expect(html).toContain('25/10/2026');
    expect(html).toContain('1.234,5 créditos por token');
    expect(html).toContain('2.469 <span>créditos</span>');
    expect(html).toContain('OTHER_UNIT');
    for (const label of ['Jugador', 'Cantidad', 'Cotización aplicada', 'Importe total', 'Fecha y hora']) {
      expect(html).toContain(label);
    }
  });

  it('keeps loading more available when current filters have no matches', () => {
    const html = renderToStaticMarkup(createElement(TransactionHistoryList, {
      items: [], players: {}, phase: 'content', hasMore: true, onLoadMore: () => {},
    }));
    expect(html).toContain('No hay operaciones cargadas que coincidan');
    expect(html).toContain('Ver más operaciones');
  });
});
