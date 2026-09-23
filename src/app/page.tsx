'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useAuth} from '@/context/AuthContext';
import PageContainer from '@/components/PageContainer';
import CatalogNav from '@/components/CatalogNav';
import styles from './CatalogPage.module.scss';

export default function Home() {
    const router = useRouter();
    const {isAuthenticated, isHydrated} = useAuth();

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
            </section>
        </PageContainer>
    );
}
