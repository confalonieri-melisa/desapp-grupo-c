'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Coins, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import {useAuth} from '@/frontend/context/AuthContext';
import ActionButton from '@/frontend/components/ui/ActionButton/ActionButton';
import { getPortfolio } from '@/frontend/services/client/player-trading.service';
import { PORTFOLIO_UPDATED_EVENT, type PortfolioUpdate } from '@/frontend/services/client/portfolio-events';
import styles from './GlobalNav.module.scss';

export default function GlobalNav() {
    const router = useRouter();
    const pathname = usePathname();
    const { logout, token, user, isAuthenticated, isHydrated } = useAuth();
    const [creditBalance, setCreditBalance] = useState<number | null>(null);
    const [balanceToken, setBalanceToken] = useState<string | null>(null);
    const [isLoadingBalance, setIsLoadingBalance] = useState(true);

    const handleLogout = useCallback(() => {
        logout();
        router.replace('/login');
    }, [logout, router]);

    useEffect(() => {
        if (!token) return;
        const controller = new AbortController();
        let latestRequest = 0;
        const loadBalance = async () => {
            const request = ++latestRequest;
            setBalanceToken(token);
            setCreditBalance(null);
            setIsLoadingBalance(true);
            try {
                const portfolio = await getPortfolio(token, controller.signal);
                if (!controller.signal.aborted && request === latestRequest) {
                    setCreditBalance(portfolio.creditBalance);
                }
            } catch (error) {
                if (!controller.signal.aborted && request === latestRequest && (error as { status?: number }).status === 401) {
                    handleLogout();
                }
            } finally {
                if (!controller.signal.aborted && request === latestRequest) setIsLoadingBalance(false);
            }
        };
        void loadBalance();
        const receivePortfolioUpdate = (event: Event) => {
            const update = (event as CustomEvent<PortfolioUpdate>).detail;
            if (!update || update.token !== token) return;
            latestRequest++;
            setBalanceToken(token);
            setCreditBalance(update.snapshot?.creditBalance ?? null);
            setIsLoadingBalance(update.status === 'loading');
        };
        window.addEventListener(PORTFOLIO_UPDATED_EVENT, receivePortfolioUpdate);
        return () => {
            controller.abort();
            window.removeEventListener(PORTFOLIO_UPDATED_EVENT, receivePortfolioUpdate);
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
                <Link className={styles.navLink} href="/ranking" aria-current={pathname === '/ranking' ? 'page' : undefined}>
                    Ranking
                </Link>
                <Link className={styles.navLink} href="/comparison" aria-current={pathname === '/comparison' ? 'page' : undefined}>
                    Comparador
                </Link>
                <Link className={styles.navLink} href="/transactions" aria-current={pathname === '/transactions' ? 'page' : undefined}>
                    Mi historial
                </Link>
                {user?.role === 'INVESTOR' && <Link className={styles.navLink} href="/portfolio" aria-current={pathname === '/portfolio' ? 'page' : undefined}>
                    Mi portfolio
                </Link>}
            </div>}
            {isHydrated && isAuthenticated && <div className={styles.balance} aria-live="polite">
                <Coins aria-hidden="true" size={18}/>
                <span className={styles.balanceLabel}>Saldo</span>
                <strong>{token && (balanceToken !== token || isLoadingBalance) ? 'Cargando…' : balanceToken !== token || creditBalance === null ? 'No disponible' : `${new Intl.NumberFormat('es-AR').format(creditBalance)} créditos`}</strong>
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
