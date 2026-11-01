'use client';

import {useCallback, useEffect, useMemo} from 'react';
import {useRouter} from 'next/navigation';
import {Eraser} from 'lucide-react';
import PageContainer from '@/frontend/components/ui/PageContainer/PageContainer';
import {useAuth} from '@/frontend/context/AuthContext';
import ComparisonChart from '@/frontend/features/comparison/components/ComparisonChart';
import ComparisonMatrix from '@/frontend/features/comparison/components/ComparisonMatrix';
import ComparisonSearch from '@/frontend/features/comparison/components/ComparisonSearch';
import ComparisonSelection from '@/frontend/features/comparison/components/ComparisonSelection';
import {EmptyComparisonState} from '@/frontend/features/comparison/components/ComparisonStates';
import {usePlayerComparison} from '@/frontend/features/comparison/hooks/usePlayerComparison';
import styles from './ComparisonPage.module.scss';

export default function ComparisonPage() {
    const router = useRouter();
    const {token, user, isAuthenticated, isHydrated, logout} = useAuth();
    const onUnauthorized = useCallback(() => {
        logout();
        router.replace('/login');
    }, [logout, router]);
    const comparison = usePlayerComparison(
        isHydrated && isAuthenticated ? token : null,
        isHydrated && isAuthenticated ? user?.id ?? null : null,
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

    if (!isHydrated || !isAuthenticated || !token || !user || comparison.isRestoring) {
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

                <div className={styles.selectionToolbar}>
                    <p className={styles.counter} aria-live="polite">
                        {comparison.selected.length} de 3 jugadores seleccionados
                    </p>
                    {comparison.selected.length > 0 && (
                        <button type="button"
                                onClick={() => comparison.selected.forEach((player) => comparison.removePlayer(player.id))}>
                            <Eraser aria-hidden="true" size={16}/> Limpiar todo
                        </button>
                    )}
                </div>

                {comparison.selected.length === 0 && <EmptyComparisonState/>}

                {comparison.selected.length === 1 && (
                    <ComparisonSelection
                        player={comparison.players[0]}
                        onRemove={comparison.removePlayer}
                        onFocusSearch={() => document.getElementById('player-name-search')?.focus()}
                    />
                )}

                {comparison.selected.length >= 2 && (
                    <div className={styles.surface}>
                        <div>
                            <ComparisonMatrix
                                players={comparison.players}
                                onRemove={comparison.removePlayer}
                            />
                        </div>

                        <ComparisonChart players={comparison.players}/>
                    </div>
                )}
            </section>
        </PageContainer>
    );
}
