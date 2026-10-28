import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HistoryViewState, TransactionHistoryItem } from '@/frontend/features/history/history';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), history: vi.fn() }));
vi.mock('@/frontend/context/AuthContext', () => ({ useAuth: mocks.auth }));
vi.mock('@/frontend/features/history/hooks/useTransactionHistory', () => ({ useTransactionHistory: mocks.history }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: string }) =>
  createElement('a', { href }, children) }));

import TransactionsPage from '@/app/transactions/page';

const item: TransactionHistoryItem = {
  id: 'trade', type: 'SELL', playerId: 'p', quantity: 2, quoteId: 'q',
  quoteValue: 3, total: 6, unit: 'CREDIT_PER_TOKEN',
  createdAt: '2026-10-26T01:30:00Z', correlationId: null,
};
const base: HistoryViewState = {
  sessionKey: JSON.stringify(['user-a', 'token']), items: [], players: {},
  phase: 'initial-loading', nextOffset: 0, hasMore: false, error: null,
};
const html = () => renderToStaticMarkup(createElement(TransactionsPage));

describe('TransactionsPage', () => {
  beforeEach(() => {
    mocks.auth.mockReturnValue({
      user: { id: 'user-a' }, token: 'token', isHydrated: true,
      isAuthenticated: true, logout: vi.fn(),
    });
    mocks.history.mockReturnValue({ ...base, loadMore: vi.fn(), retry: vi.fn() });
  });

  it('hides protected rows until the current session is hydrated', () => {
    mocks.auth.mockReturnValue({ user: null, token: null, isHydrated: false, isAuthenticated: false, logout: vi.fn() });
    expect(html()).toBe('');
    mocks.auth.mockReturnValue({ user: { id: 'user-b' }, token: 'other', isHydrated: true, isAuthenticated: true, logout: vi.fn() });
    expect(html()).toBe('');
  });

  it('announces initial loading and shows an empty message only after an empty result', () => {
    expect(html()).toContain('role="status"');
    expect(html()).toContain('Cargando operaciones');
    expect(html()).not.toContain('Todavía no tenés operaciones');
    mocks.history.mockReturnValue({ ...base, phase: 'empty', loadMore: vi.fn(), retry: vi.fn() });
    expect(html()).toContain('Todavía no tenés operaciones');
  });

  it('renders accessible initial, page, and access errors with appropriate retry controls', () => {
    mocks.history.mockReturnValue({ ...base, phase: 'initial-error', error: 'Falló la carga', loadMore: vi.fn(), retry: vi.fn() });
    expect(html()).toContain('role="alert"');
    expect(html()).toContain('Reintentar');
    expect(html()).not.toContain('Todavía no tenés operaciones');
    mocks.history.mockReturnValue({ ...base, phase: 'page-error', items: [item], hasMore: true, error: 'Falló la página', loadMore: vi.fn(), retry: vi.fn() });
    expect(html()).toContain('Venta');
    expect(html()).toContain('Falló la página');
    expect(html()).toContain('Reintentar');
    mocks.history.mockReturnValue({ ...base, phase: 'access-denied', error: 'Acceso denegado', loadMore: vi.fn(), retry: vi.fn() });
    expect(html()).toContain('Acceso denegado');
    expect(html()).not.toContain('Reintentar');
  });

  it('shows pagination progress and a clear end marker', () => {
    mocks.history.mockReturnValue({ ...base, phase: 'content', items: [item], hasMore: true, loadMore: vi.fn(), retry: vi.fn() });
    expect(html()).toContain('Ver más operaciones');
    expect(html()).toContain('Operaciones cargadas');
    expect(html()).not.toContain('Volumen cargado');
    expect(html()).toContain('Buscar jugador');
    expect(html()).toContain('Todos los períodos');
    mocks.history.mockReturnValue({ ...base, phase: 'loading-more', items: [item], hasMore: true, loadMore: vi.fn(), retry: vi.fn() });
    expect(html()).toContain('disabled=""');
    expect(html()).toContain('Cargando más operaciones');
    mocks.history.mockReturnValue({ ...base, phase: 'content', items: [item], hasMore: false, loadMore: vi.fn(), retry: vi.fn() });
    expect(html()).toContain('Llegaste al final del historial');
    expect(html()).not.toContain('Ver más operaciones');
  });
});
