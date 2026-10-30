'use client';

import { Search, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { CatalogPlayer } from '@/frontend/features/catalog/player-catalog';
import type { SearchState } from '@/frontend/features/comparison/comparison';
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
  const [query, setQuery] = useState(state.query);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(query);
  };

  return (
    <section
      className={styles.search}
      aria-labelledby="comparison-search-title"
    >
      <h2 id="comparison-search-title" className={styles.srOnly}>
        Buscar jugadores para comparar
      </h2>
      <form className={styles.searchForm} role="search" onSubmit={submit}>
        <label htmlFor="comparison-search-input">
          <Search aria-hidden="true" size={20} />
          <span className={styles.srOnly}>Buscar jugador por nombre</span>
        </label>
        <input
          id="comparison-search-input"
          type="search"
          value={query}
          placeholder="Buscar jugador para agregar..."
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>

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
                <span className={styles.searchIdentity}>
                  <strong>{player.name}</strong>
                  <small>
                    {player.team} · {player.league} · {player.position}
                  </small>
                </span>
                <button
                  type="button"
                  disabled={isSelected || !canAdd}
                  aria-label={label}
                  onClick={() => onAdd(player)}
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
