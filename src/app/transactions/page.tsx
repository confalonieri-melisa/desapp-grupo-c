'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, RotateCcw, Search, ShoppingCart, Tag } from 'lucide-react';
import { useAuth } from '@/frontend/context/AuthContext';
import PageContainer from '@/frontend/components/ui/PageContainer/PageContainer';
import TransactionHistoryList from '@/frontend/features/history/components/TransactionHistoryList';
import { useTransactionHistory } from '@/frontend/features/history/hooks/useTransactionHistory';
import { filterHistoryItems, formatHistoryNumber, historyMonthKey, historyMonthLabel, type HistoryFilters } from '@/frontend/features/history/history';
import styles from './TransactionsPage.module.scss';

export default function TransactionsPage() {
  const router = useRouter();
  const { user, token, isHydrated, isAuthenticated, logout } = useAuth();
  const onUnauthorized = useCallback(() => {
    logout();
    router.replace('/login');
  }, [logout, router]);
  const history = useTransactionHistory(
    isHydrated && isAuthenticated ? user?.id ?? null : null,
    isHydrated && isAuthenticated ? token : null,
    onUnauthorized,
  );
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<HistoryFilters['type']>('ALL');
  const [periodFilter, setPeriodFilter] = useState('ALL');
  const months = useMemo(() => {
    const unique = new Map<string, string>();
    for (const item of history.items) unique.set(historyMonthKey(item.createdAt), historyMonthLabel(item.createdAt));
    return [...unique].sort(([left], [right]) => right.localeCompare(left));
  }, [history.items]);
  const filteredItems = useMemo(() => filterHistoryItems(history.items, history.players, {
    search, type: typeFilter, period: periodFilter,
  }), [history.items, history.players, periodFilter, search, typeFilter]);
  const buys = history.items.filter((item) => item.type === 'BUY').length;
  const sales = history.items.length - buys;
  const hasFilters = Boolean(search || typeFilter !== 'ALL' || periodFilter !== 'ALL');

  useEffect(() => {
    if (isHydrated && (!isAuthenticated || !user)) router.replace('/login');
  }, [isAuthenticated, isHydrated, router, user]);

  if (!isHydrated || !isAuthenticated || !user || !token ||
    history.sessionKey !== JSON.stringify([user.id, token])) return null;

  const { phase, items, players, error, hasMore, loadMore, retry } = history;
  return (
    <PageContainer className={styles.page}>
      <section className={styles.content} aria-labelledby="history-title">
        <header className={styles.header}>
          <h1 id="history-title">Mi historial</h1>
          <p>Compras y ventas completadas. Hora de Buenos Aires (ART).</p>
        </header>
        {phase === 'initial-loading' && <p role="status">Cargando operaciones…</p>}
        {phase === 'empty' && <p role="status">Todavía no tenés operaciones en tu historial.</p>}
        {phase === 'initial-error' && <div className={styles.error} role="alert">
          <p>{error}</p><button type="button" onClick={retry}>Reintentar</button>
        </div>}
        {phase === 'access-denied' && <p className={styles.error} role="alert">{error}</p>}
        {items.length > 0 && phase !== 'access-denied' && <>
          <section className={styles.summary} aria-label="Resumen de operaciones cargadas">
            <div className={styles.summaryItem}><span className={styles.summaryIcon}><BarChart3 aria-hidden="true" /></span><div><span>Operaciones cargadas</span><strong>{formatHistoryNumber(items.length)}</strong></div></div>
            <div className={styles.summaryItem}><span className={styles.summaryIcon}><ShoppingCart aria-hidden="true" /></span><div><span>Compras</span><strong>{formatHistoryNumber(buys)}</strong></div></div>
            <div className={styles.summaryItem}><span className={styles.summaryIcon}><Tag aria-hidden="true" /></span><div><span>Ventas</span><strong>{formatHistoryNumber(sales)}</strong></div></div>
          </section>
          <div className={styles.filters} role="search" aria-label="Filtrar operaciones cargadas">
            <label className={styles.search}>
              <Search aria-hidden="true" size={22} />
              <span className={styles.srOnly}>Buscar jugador</span>
              <input type="search" placeholder="Buscar jugador..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <label className={styles.selectField}><span>Tipo</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as HistoryFilters['type'])}><option value="ALL">Todas</option><option value="BUY">Compras</option><option value="SELL">Ventas</option></select></label>
            <label className={styles.selectField}><span>Período</span><select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)}><option value="ALL">Todos los períodos</option>{months.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <button className={styles.clearButton} type="button" disabled={!hasFilters} onClick={() => { setSearch(''); setTypeFilter('ALL'); setPeriodFilter('ALL'); }}><RotateCcw aria-hidden="true" size={18} />Limpiar filtros</button>
          </div>
          <p className={styles.filterNote}>El resumen y los filtros incluyen las operaciones cargadas. Podés cargar más para ver las anteriores.</p>
          <TransactionHistoryList
            items={filteredItems} players={players} phase={phase} hasMore={hasMore}
            error={error} onLoadMore={loadMore} onRetry={retry}
          />
        </>}
      </section>
    </PageContainer>
  );
}
