'use client';

import { UserPlus } from 'lucide-react';
import type { CatalogPlayer } from '@/frontend/features/catalog/player-catalog';
import PlayerCardImage from '@/frontend/features/catalog/components/PlayerCardImage/PlayerCardImage';
import PlayerNameSearch from '@/frontend/features/catalog/components/PlayerNameSearch/PlayerNameSearch';
import type { SearchState } from '@/frontend/features/comparison/comparison';
import { formatEnumLabel, leagueLabels } from '@/frontend/utils/player-labels';
import styles from '@/app/comparison/ComparisonPage.module.scss';

interface Props {
  state: SearchState;
  selectedIds: ReadonlySet<string>;
  onSearch: (query: string) => void;
  onAdd: (player: CatalogPlayer) => void;
  canAdd: boolean;
}

export default function ComparisonSearch({
  state,
  selectedIds,
  onSearch,
  onAdd,
  canAdd,
}: Props) {
  return (
    <section
      className={styles.search}
      aria-labelledby="comparison-search-title"
    >
      <h2 id="comparison-search-title" className={styles.srOnly}>
        Buscar jugadores para comparar
      </h2>
      <PlayerNameSearch key={state.query} initialValue={state.query} onSearch={onSearch} />

      {state.phase === 'loading' && (
        <p role="status">Buscando jugadores…</p>
      )}

      {state.phase === 'error' && (
        <p className={styles.searchError} role="alert">
          {state.error}
          <button type="button" onClick={() => onSearch(state.query)}>
            Reintentar
          </button>
        </p>
      )}

      {state.phase === 'empty' && (
        <p role="status">No hay jugadores que coincidan con la búsqueda.</p>
      )}

      {state.phase === 'content' && (
        <ul className={styles.searchResults} aria-label="Resultados de búsqueda">
          {state.results.map((player) => {
            const isSelected = selectedIds.has(player.id);
            const label = isSelected
              ? `${player.name} ya seleccionado`
              : canAdd
                ? `Agregar ${player.name}`
                : 'Máximo de tres jugadores alcanzado';

            return (
              <li key={player.id}>
                <PlayerCardImage playerId={player.id} playerName={player.name} imageUrl={player.imageUrl} />
                <span className={styles.searchIdentity}>
                  <strong>{player.name}</strong>
                  <small>
                    {player.team} · {leagueLabels[player.league] ?? formatEnumLabel(player.league)} · {formatEnumLabel(player.position)}
                  </small>
                </span>
                <button
                  type="button"
                  disabled={isSelected || !canAdd}
                  aria-label={label}
                  onClick={() => {
                    onAdd(player);
                    onSearch('');
                  }}
                >
                  <UserPlus aria-hidden="true" size={16} />
                  {isSelected ? 'Seleccionado' : canAdd ? 'Agregar' : 'Máximo 3'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
