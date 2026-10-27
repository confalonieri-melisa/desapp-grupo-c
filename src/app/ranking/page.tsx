'use client';

import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/frontend/context/AuthContext';
import PageContainer from '@/frontend/components/ui/PageContainer/PageContainer';
import RankingList from '@/frontend/features/ranking/components/RankingList';
import RankingFilters from '@/frontend/features/ranking/components/RankingFilters';
import RankingPagination from '@/frontend/features/ranking/components/RankingPagination';
import { usePlayerRanking } from '@/frontend/features/ranking/hooks/usePlayerRanking';
import type { RankingSelection } from '@/frontend/features/ranking/ranking';
import { parseRankingSelection, serializeRankingSelection } from '@/frontend/features/ranking/utils/ranking-url';
import { formatStrategy } from '@/frontend/features/profile/utils/player-quotes';
import styles from './RankingPage.module.scss';

function RankingPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selection = useMemo(() => parseRankingSelection(new URLSearchParams(searchParams.toString())), [searchParams]);
  const { token, isAuthenticated, isHydrated, logout } = useAuth();
  const onUnauthorized = useCallback(() => {
    logout();
    router.replace('/login');
  }, [logout, router]);
  const ranking = usePlayerRanking(isHydrated && isAuthenticated ? token : null, selection, onUnauthorized);

  const navigate = (next: RankingSelection) => {
    const query = serializeRankingSelection(next);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const totalPages = ranking.data?.pagination.totalPages;
  const correctedPage = totalPages === undefined ? null : totalPages === 0 ? 1 : Math.min(selection.page, totalPages);
  const needsPageCorrection = ranking.phase !== 'loading' && correctedPage !== null && correctedPage !== selection.page;

  useEffect(() => {
    if (isHydrated && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isHydrated, router]);

  useEffect(() => {
    if (needsPageCorrection && correctedPage !== null) {
      const query = serializeRankingSelection({ ...selection, page: correctedPage });
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [correctedPage, needsPageCorrection, pathname, router, selection]);

  if (!isHydrated || !isAuthenticated || !token || ranking.sessionKey !== token) return null;

  return (
    <PageContainer className={styles.page}>
      <section className={styles.content} aria-labelledby="ranking-title">
        <header className={styles.heading}>
          <h1 id="ranking-title">Ranking</h1>
          <p>Jugadores ordenados según la valuación activa.</p>
        </header>
        <RankingFilters
          key={selection.team ?? ''}
          selection={selection}
          onChange={(next) => navigate({ ...next, page: 1 })}
          onClear={() => navigate({ page: 1 })}
        />
        {(ranking.phase === 'loading' || needsPageCorrection) && <p role="status">Cargando ranking…</p>}
        {ranking.phase === 'error' && <div className={styles.error} role="alert">
          <p>{ranking.error}</p>
          <button type="button" onClick={ranking.retry}>Reintentar</button>
        </div>}
        {ranking.phase === 'no-active-strategy' && <div className={styles.error} role="alert">
          <p>{ranking.error ?? 'No hay una estrategia de valuación activa.'}</p>
          <button type="button" onClick={ranking.retry}>Actualizar ranking</button>
        </div>}
        {ranking.phase === 'empty' && !needsPageCorrection && <p role="status">No hay jugadores rankeados.</p>}
        {ranking.phase === 'content' && ranking.data && !needsPageCorrection && <>
          <p className={styles.strategy}>Estrategia activa: {formatStrategy(ranking.data.strategyCode)} · versión {ranking.data.strategyVersion}</p>
          <RankingList players={ranking.data.players} />
          <RankingPagination
            pagination={ranking.data.pagination}
            onPageChange={(page) => navigate({ ...selection, page })}
          />
        </>}
      </section>
    </PageContainer>
  );
}

export default function RankingPage() {
  return <Suspense fallback={null}><RankingPageContent /></Suspense>;
}
