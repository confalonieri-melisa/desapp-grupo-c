import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { League, Position } from '@/backend/models/enums';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), ranking: vi.fn(), pathname: vi.fn(), search: vi.fn(), replace: vi.fn() }));
vi.mock('@/frontend/context/AuthContext', () => ({ useAuth: mocks.auth }));
vi.mock('@/frontend/features/ranking/hooks/usePlayerRanking', () => ({ usePlayerRanking: mocks.ranking }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }), usePathname: mocks.pathname, useSearchParams: mocks.search }));
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: string }) =>
  createElement('a', { href, ...props }, children) }));

import RankingPage from '@/app/ranking/page';
import GlobalNav from '@/frontend/components/GlobalNav/GlobalNav';

const data = {
  strategyCode: 'INDIVIDUAL_PERFORMANCE', strategyVersion: '1.0.0',
  players: [
    { rank: 2, player: { id: 'b', name: 'Bea', team: 'Arsenal', league: League.PREMIER_LEAGUE, position: Position.FORWARD }, finalScore: 0.8, quoteValue: 80, unit: 'CREDIT_PER_TOKEN', calculatedAt: '2026-10-26T12:00:00Z' },
    { rank: 1, player: { id: 'a', name: 'Ana', team: 'Arsenal', league: League.PREMIER_LEAGUE, position: Position.FORWARD }, finalScore: 0.8, quoteValue: 83.5, unit: 'CREDIT_PER_TOKEN', calculatedAt: '2026-10-26T12:00:00Z' },
  ],
  pagination: { total: 2, page: 1, limit: 20, totalPages: 1 },
};

describe('RankingPage MVP', () => {
  beforeEach(() => {
    mocks.auth.mockReturnValue({ token: 'token', isAuthenticated: true, isHydrated: true, logout: vi.fn() });
    mocks.ranking.mockReturnValue({ sessionKey: 'token', phase: 'content', data });
    mocks.pathname.mockReturnValue('/ranking');
    mocks.search.mockReturnValue(new URLSearchParams());
  });

  it('renders the received positions, quote, context and profile link without sorting', () => {
    const html = renderToStaticMarkup(createElement(RankingPage));
    expect(html.indexOf('Bea')).toBeLessThan(html.indexOf('Ana'));
    expect(html).toContain('Puesto 2');
    expect(html).toContain('Puesto 1');
    expect(html).toContain('83,5');
    expect(html).toContain('créditos por token');
    expect(html).toContain('09:00');
    expect(html).not.toContain('UTC');
    expect(html).not.toContain('1.0.0');
    expect(html).toContain('href="/players/a"');
  });

  it('shows Ranking in the authenticated navigation and hides protected content before hydration', () => {
    const nav = renderToStaticMarkup(createElement(GlobalNav));
    expect(nav).toContain('href="/ranking"');
    expect(nav).toContain('aria-current="page"');
    mocks.auth.mockReturnValue({ token: null, isAuthenticated: false, isHydrated: false, logout: vi.fn() });
    expect(renderToStaticMarkup(createElement(RankingPage))).toBe('');
  });

  it('keeps server positions and offers filtered navigation on page two', () => {
    mocks.search.mockReturnValue(new URLSearchParams('league=PREMIER_LEAGUE&team=Ars&position=FORWARD&page=2'));
    mocks.ranking.mockReturnValue({
      sessionKey: 'token', phase: 'content',
      data: { ...data, players: [{ ...data.players[0], rank: 21 }], pagination: { total: 41, page: 2, limit: 20, totalPages: 3 } },
    });
    const html = renderToStaticMarkup(createElement(RankingPage));
    expect(html).toContain('Puesto 21');
    expect(html).toContain('Página 2 de 3');
    expect(html).toContain('41 jugadores');
    expect(html).toContain('value="Ars"');
    expect(html).toContain('name="team"');
    expect(html).toContain('Limpiar filtros');
    expect(mocks.ranking.mock.calls.at(-1)?.[1]).toEqual({ league: League.PREMIER_LEAGUE, team: 'Ars', position: Position.FORWARD, page: 2 });
  });

  it('distinguishes loading, empty, recoverable error, and missing active strategy', () => {
    mocks.ranking.mockReturnValue({ sessionKey: 'token', phase: 'loading', data: null });
    expect(renderToStaticMarkup(createElement(RankingPage))).toContain('Cargando ranking');
    mocks.ranking.mockReturnValue({ sessionKey: 'token', phase: 'empty', data: { ...data, players: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } } });
    const empty = renderToStaticMarkup(createElement(RankingPage));
    expect(empty).toContain('No hay jugadores rankeados');
    expect(empty).toContain('Limpiar filtros');
    mocks.ranking.mockReturnValue({ sessionKey: 'token', phase: 'error', error: 'No se pudo cargar el ranking.', data: null, retry: vi.fn() });
    const error = renderToStaticMarkup(createElement(RankingPage));
    expect(error).toContain('role="alert"');
    expect(error).toContain('Reintentar');
    mocks.ranking.mockReturnValue({ sessionKey: 'token', phase: 'no-active-strategy', data: null, retry: vi.fn() });
    const noStrategy = renderToStaticMarkup(createElement(RankingPage));
    expect(noStrategy).toContain('No hay una estrategia de valuación activa');
    expect(noStrategy).not.toContain('No hay jugadores rankeados');
  });
});
