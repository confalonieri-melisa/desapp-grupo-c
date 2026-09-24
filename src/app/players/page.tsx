'use client';

import {Suspense, useCallback, useEffect, useMemo} from 'react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {useAuth} from '@/context/AuthContext';
import PageContainer from '@/components/ui/PageContainer/PageContainer';
import PlayerFilters from '@/features/catalog/components/PlayerFilters/PlayerFilters';
import PlayerGrid from '@/features/catalog/components/PlayerGrid/PlayerGrid';
import PlayerPagination from '@/features/catalog/components/PlayerPagination/PlayerPagination';
import type {PlayerCatalogFilters} from '@/catalog/player-catalog';
import {League, Position} from '@/models/enums';
import {usePlayerCatalog} from '@/features/catalog/hooks/usePlayerCatalog';
import {
    emptyPlayerCatalogFilters,
    parsePlayerCatalogFilters,
    parsePlayerCatalogPage,
    serializePlayerCatalogFilters,
} from '@/features/catalog/utils/player-catalog-url';
import styles from '@/app/PlayersPage.module.scss';

function PlayersPageContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const {isAuthenticated, isHydrated, token, logout} = useAuth();
    const filters = useMemo(
        () => parsePlayerCatalogFilters(new URLSearchParams(searchParams.toString())),
        [searchParams],
    );
    const page = useMemo(
        () => parsePlayerCatalogPage(new URLSearchParams(searchParams.toString())),
        [searchParams],
    );

    const handleUnauthorized = useCallback(() => {
        logout();
        router.replace('/login');
    }, [logout, router]);

    const catalogToken = isHydrated && isAuthenticated ? token : null;

    const {players, isLoading, error, pagination} = usePlayerCatalog(
        catalogToken,
        filters,
        page,
        handleUnauthorized,
    );

    useEffect(() => {
        if (isHydrated && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, isHydrated, router]);

    const updateFilters = (nextFilters: PlayerCatalogFilters) => {
        const query = serializePlayerCatalogFilters(nextFilters);
        router.replace(query ? `${pathname}?${query}` : pathname, {scroll: false});
    };

    const updatePage = (nextPage: number) => {
        const query = serializePlayerCatalogFilters(filters, nextPage);
        router.replace(query ? `${pathname}?${query}` : pathname, {scroll: false});
    };

    if (!isHydrated || !isAuthenticated) {
        return null;
    }

    const teams = [...new Set(players.map((player) => player.team))].sort();

    return (
        <PageContainer className={styles.page}>
            <section aria-labelledby="players-title" className={styles.content}>
                <div className={styles.heading}>
                    <h1 id="players-title" className={styles.title}>Jugadores</h1>
                    <p className={styles.description}>Explora y analiza el catálogo de jugadores de futbol.</p>
                </div>
                <div className={styles.catalogLayout}>
                    <aside className={styles.sidebar}>
                        <PlayerFilters
                            filters={filters}
                            leagues={Object.values(League)}
                            teams={teams}
                            positions={Object.values(Position)}
                            onChange={updateFilters}
                            onReset={() => updateFilters(emptyPlayerCatalogFilters)}
                        />
                    </aside>
                    <div className={`${styles.catalog} ${styles.box}`}>
                        <p className={styles.resultCount} aria-live="polite">
                            {isLoading ? 'Cargando jugadores...' : `${pagination.total} ${pagination.total === 1 ? 'jugador encontrado' : 'jugadores encontrados'}`}
                        </p>
                        {error && <p className={styles.errorState} role="alert">{error}</p>}
                        {!isLoading && !error && players.length > 0 && <PlayerGrid players={players}/>}
                        {!isLoading && !error && players.length === 0 && (
                            <p className={styles.emptyState}>
                                No hay jugadores que coincidan con los filtros seleccionados.
                            </p>
                        )}
                        {!isLoading && !error && pagination.totalPages > 1 && (
                            <PlayerPagination
                                page={page}
                                totalPages={pagination.totalPages}
                                onPageChange={updatePage}
                            />
                        )}
                    </div>
                </div>
            </section>
        </PageContainer>
    );
}

export default function PlayersPage() {
    return (
        <Suspense fallback={null}>
            <PlayersPageContent />
        </Suspense>
    );
}
