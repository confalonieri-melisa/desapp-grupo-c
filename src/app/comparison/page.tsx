'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/frontend/components/ui/PageContainer/PageContainer';
import { useAuth } from '@/frontend/context/AuthContext';
import ComparisonChart from '@/frontend/features/comparison/components/ComparisonChart';
import ComparisonMatrix from '@/frontend/features/comparison/components/ComparisonMatrix';
import ComparisonSearch from '@/frontend/features/comparison/components/ComparisonSearch';
import {
  EmptyComparisonState,
  IncompleteComparisonState,
} from '@/frontend/features/comparison/components/ComparisonStates';
import { usePlayerComparison } from '@/frontend/features/comparison/hooks/usePlayerComparison';
import styles from './ComparisonPage.module.scss';

export default function ComparisonPage() {
  const router = useRouter();
  const { token, isAuthenticated, isHydrated, logout } = useAuth();
  const onUnauthorized = useCallback(() => {
    logout();
    router.replace('/login');
  }, [logout, router]);
  const comparison = usePlayerComparison(
    isHydrated && isAuthenticated ? token : null,
    onUnauthorized,
  );
  const selectedIds = useMemo(
    () => new Set(comparison.selected.map((player) => player.id)),
    [comparison.selected],
  );

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isHydrated, router]);

  if (!isHydrated || !isAuthenticated || !token) {
    return null;
  }

  return (
    <PageContainer className={styles.page}>
      <section className={styles.content} aria-labelledby="comparison-title">
        <header className={styles.heading}>
          <h1 id="comparison-title">Comparador de jugadores</h1>
          <p>Analizá y compará hasta 3 jugadores antes de invertir.</p>
        </header>

        <ComparisonSearch
          state={comparison.search}
          selectedIds={selectedIds}
          canAdd={comparison.selected.length < 3}
          onSearch={comparison.searchPlayers}
          onAdd={comparison.addPlayer}
        />

        <p className={styles.counter} aria-live="polite">
          {comparison.selected.length} de 3 jugadores seleccionados
        </p>

        {comparison.selected.length === 0 && <EmptyComparisonState />}

        {comparison.selected.length > 0 && (
          <div className={styles.surface}>
            <div>
              <ComparisonMatrix
                players={comparison.players}
                onRemove={comparison.removePlayer}
              />
              {comparison.selected.length === 1 && <IncompleteComparisonState />}
            </div>

            {comparison.selected.length >= 2 && (
              <ComparisonChart players={comparison.players} />
            )}
          </div>
        )}
      </section>
    </PageContainer>
  );
}
