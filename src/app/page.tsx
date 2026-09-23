'use client';

import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useAuth} from '@/context/AuthContext';
import PageContainer from '@/components/ui/PageContainer/PageContainer';
import CatalogNav from '@/features/catalog/components/CatalogNav/CatalogNav';
import PlayerFilters from '@/features/catalog/components/PlayerFilters/PlayerFilters';
import {playerFixture} from '@/catalog/player-fixture';
import {filterPlayers, type PlayerCatalogFilters} from '@/catalog/player-catalog';
import {League, Position} from '@/models/enums';
import styles from './CatalogPage.module.scss';

const initialFilters: PlayerCatalogFilters = {
    league: '',
    team: '',
    position: '',
};

export default function Home() {
    const router = useRouter();
    const {isAuthenticated, isHydrated} = useAuth();
    const [filters, setFilters] = useState<PlayerCatalogFilters>(initialFilters);

    const filteredPlayers = useMemo(
        () => filterPlayers(playerFixture, filters),
        [filters],
    );

    useEffect(() => {
        if (isHydrated && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, isHydrated, router]);

    if (!isHydrated || !isAuthenticated) {
        return null;
    }

    return (
        <PageContainer className={styles.page}>
            <CatalogNav/>
            <section aria-labelledby="catalog-title" className={styles.content}>
                <h1 id="catalog-title" className={styles.title}>Jugadores</h1>
                <p className={styles.description}>Explora y analiza el catálogo de jugadores de futbol.</p>
                <PlayerFilters
                    filters={filters}
                    leagues={Object.values(League)}
                    teams={[...new Set(playerFixture.map((player) => player.team))].sort()}
                    positions={Object.values(Position)}
                    onChange={setFilters}
                    onReset={() => setFilters(initialFilters)}
                />
                <p className={styles.resultCount} aria-live="polite">
                    {filteredPlayers.length} {filteredPlayers.length === 1 ? 'jugador encontrado' : 'jugadores encontrados'}
                </p>
                {filteredPlayers.length === 0 && (
                    <p className={styles.emptyState}>
                        No hay jugadores que coincidan con los filtros seleccionados.
                    </p>
                )}
            </section>
        </PageContainer>
    );
}
