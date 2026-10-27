import type { RankingPagination as Pagination } from '@/frontend/features/ranking/ranking';
import styles from './RankingPagination.module.scss';

interface Props {
  pagination: Pagination;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

export default function RankingPagination({ pagination, disabled = false, onPageChange }: Props) {
  const { page, total, totalPages } = pagination;
  if (totalPages === 0) return null;
  return (
    <nav className={styles.pagination} aria-label="Paginación del ranking">
      <span>{total} {total === 1 ? 'jugador' : 'jugadores'} · Página {page} de {totalPages}</span>
      <div className={styles.actions}>
        <button type="button" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</button>
        <button type="button" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)}>Siguiente</button>
      </div>
    </nav>
  );
}
