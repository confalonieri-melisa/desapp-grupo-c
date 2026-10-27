import Link from 'next/link';
import Image from 'next/image';
import { ArrowDownLeft, ArrowUpRight, Globe2, Shield, UserRound } from 'lucide-react';
import { getPlayerImage } from '@/frontend/utils/image-mapper';
import { formatEnumLabel, leagueLabels } from '@/frontend/utils/player-labels';
import {
  formatHistoryDateOnly,
  formatHistoryTimeOnly,
  formatHistoryNumber,
  formatQuoteUnit,
  type PlayerReference,
  type HistoryViewState,
  type TransactionHistoryItem,
} from '@/frontend/features/history/history';
import styles from './TransactionHistoryList.module.scss';

interface Props {
  items: TransactionHistoryItem[];
  players: Record<string, PlayerReference>;
  phase?: HistoryViewState['phase'];
  hasMore?: boolean;
  error?: string | null;
  onLoadMore?: () => void;
  onRetry?: () => void;
}

export default function TransactionHistoryList({ items, players, phase, hasMore, error, onLoadMore, onRetry }: Props) {
  return (
    <>
    {items.length === 0 && <p className={styles.noMatches} role="status">No hay operaciones cargadas que coincidan con los filtros.</p>}
    <ol className={styles.list} aria-label="Operaciones">
      {items.map((item) => {
        const player = players[item.playerId];
        const resolved = player?.status === 'resolved' ? player : null;
        const isBuy = item.type === 'BUY';
        return (
          <li className={styles.row} key={item.id}>
            <div className={`${styles.typeBadge} ${isBuy ? styles.buy : styles.sell}`}>
              {isBuy ? <ArrowDownLeft aria-hidden="true" size={25} /> : <ArrowUpRight aria-hidden="true" size={25} />}
              <strong>{isBuy ? 'Compra' : 'Venta'}</strong>
            </div>
            <div className={styles.player}>
              <span className={styles.playerImage}>
                {resolved ? <Image src={getPlayerImage(item.playerId, resolved.imageUrl)} alt={`Imagen de ${resolved.name}`} fill sizes="68px" /> : <UserRound aria-hidden="true" size={28} />}
              </span>
              <div className={styles.playerInfo}>
                <span className={styles.srOnly}>Jugador: </span>
                {resolved ? <Link className={styles.playerLink} href={`/players/${encodeURIComponent(item.playerId)}`}>{resolved.name}</Link> : <span className={styles.playerId}>{item.playerId}</span>}
                {resolved && (resolved.team || resolved.league) && <div className={styles.playerMeta}>
                  {resolved.team && <span><Shield aria-hidden="true" size={15}/>{resolved.team}</span>}
                  {resolved.league && <span><Globe2 aria-hidden="true" size={15}/>{leagueLabels[resolved.league] ?? formatEnumLabel(resolved.league)}</span>}
                </div>}
              </div>
            </div>
            <dl className={styles.fields}>
              <div><dt>Cantidad</dt><dd>{formatHistoryNumber(item.quantity)} {item.quantity === 1 ? 'token' : 'tokens'}</dd></div>
              <div><dt>Cotización aplicada</dt><dd>{formatHistoryNumber(item.quoteValue)} {formatQuoteUnit(item.unit)}</dd></div>
              <div className={`${styles.total} ${isBuy ? styles.totalBuy : styles.totalSell}`}><dt>Importe total</dt><dd>{formatHistoryNumber(item.total)} <span>créditos</span></dd></div>
            </dl>
            <time className={styles.date} dateTime={item.createdAt}><span className={styles.srOnly}>Fecha y hora: </span><span>{formatHistoryDateOnly(item.createdAt)}</span><strong>{formatHistoryTimeOnly(item.createdAt)}</strong></time>
          </li>
        );
      })}
    </ol>
    {phase === 'page-error' && <div className={styles.error} role="alert">
      <p>{error}</p><button type="button" onClick={onRetry}>Reintentar</button>
    </div>}
    {hasMore && phase !== 'page-error' && <div className={styles.pagination}>
      <button type="button" onClick={onLoadMore} disabled={phase === 'loading-more'}>
        {phase === 'loading-more' ? 'Cargando más operaciones…' : 'Ver más operaciones'}
      </button>
      {phase === 'loading-more' && <p role="status">Cargando más operaciones…</p>}
    </div>}
    {hasMore === false && <p className={styles.end} role="status">Llegaste al final del historial.</p>}
    </>
  );
}
