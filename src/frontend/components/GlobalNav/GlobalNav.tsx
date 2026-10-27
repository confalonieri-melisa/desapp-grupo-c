'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Coins, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import {useAuth} from '@/frontend/context/AuthContext';
import ActionButton from '@/frontend/components/ui/ActionButton/ActionButton';
import { getPortfolio } from '@/frontend/services/client/player-trading.service';
import styles from './GlobalNav.module.scss';

export default function GlobalNav() {
    const router = useRouter();
    const pathname = usePathname();
    const { logout, token, isAuthenticated, isHydrated } = useAuth();
    const [creditBalance, setCreditBalance] = useState<number | null>(null);
    const [loadedToken, setLoadedToken] = useState<string | null>(null);
    const [isLoadingBalance, setIsLoadingBalance] = useState(true);

    const handleLogout = useCallback(() => {
        logout();
        router.replace('/login');
    }, [logout, router]);

    useEffect(() => {
        if (!token) return;
        const controller = new AbortController();
        const loadBalance = async () => {
            setIsLoadingBalance(true);
            try {
                const portfolio = await getPortfolio(token, controller.signal);
                if (!controller.signal.aborted) setCreditBalance(portfolio.creditBalance);
            } catch (error) {
                if (!controller.signal.aborted && (error as { status?: number }).status === 401) {
                    handleLogout();
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoadedToken(token);
                    setIsLoadingBalance(false);
                }
            }
        };
        void loadBalance();
        const refreshBalance = () => { void loadBalance(); };
        window.addEventListener('portfolio-updated', refreshBalance);
        return () => {
            controller.abort();
            window.removeEventListener('portfolio-updated', refreshBalance);
        };
    }, [handleLogout, token]);

    return (
        <nav className={styles.nav} aria-label="Navegación principal">
            <Link className={styles.brand} href="/players">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={"MedioCampo Logo"} className={styles.logo} srcSet="/favicon.svg" width={32} height={32}>
                </img>
                <h1 className={styles.brandText}>MedioCampo</h1>
            </Link>
            {isHydrated && isAuthenticated && <div className={styles.actions}>
                <Link className={styles.navLink} href="/players" aria-current={pathname.startsWith('/players') ? 'page' : undefined}>
                    Jugadores
                </Link>
                <Link className={styles.navLink} href="/transactions" aria-current={pathname === '/transactions' ? 'page' : undefined}>
                    Mi historial
                </Link>
            </div>}
            {isHydrated && isAuthenticated && <div className={styles.balance} aria-live="polite">
                <Coins aria-hidden="true" size={18}/>
                <span className={styles.balanceLabel}>Saldo</span>
                <strong>{loadedToken !== token || isLoadingBalance ? 'Cargando…' : creditBalance === null ? 'No disponible' : `${new Intl.NumberFormat('es-AR').format(creditBalance)} créditos`}</strong>
            </div>}
            {isHydrated && isAuthenticated && <ActionButton
                className={styles.logoutButton}
                text="Cerrar sesión"
                type="button"
                icon={<LogOut aria-hidden="true" size={18}/>}
                onClick={handleLogout}
            />}
        </nav>
    );
}
