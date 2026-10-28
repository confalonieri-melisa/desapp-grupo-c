'use client';

import { useState, type FormEvent } from 'react';
import { Search, X } from 'lucide-react';
import styles from './PlayerNameSearch.module.scss';

interface Props {
  initialValue: string;
  onSearch: (name: string) => void;
}

export default function PlayerNameSearch({ initialValue, onSearch }: Props) {
  const [name, setName] = useState(initialValue);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(name.trim());
  };

  return (
    <form className={styles.form} role="search" onSubmit={submit}>
      <label className={styles.field} htmlFor="player-name-search">
        <Search aria-hidden="true" size={21} />
        <span className={styles.srOnly}>Buscar jugador por nombre</span>
        <input
          id="player-name-search"
          type="search"
          value={name}
          placeholder="Buscar jugador por nombre..."
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      {name && <button className={styles.clear} type="button" onClick={() => { setName(''); onSearch(''); }} aria-label="Limpiar búsqueda">
        <X aria-hidden="true" size={18} />
      </button>}
      <button className={styles.submit} type="submit">Buscar</button>
    </form>
  );
}
