import { useState, type FormEvent } from 'react';
import { RotateCcw, Search, Shield, Target, Trophy } from 'lucide-react';
import { League, Position } from '@/backend/models/enums';
import type { RankingSelection } from '@/frontend/features/ranking/ranking';
import { formatEnumLabel, leagueLabels } from '@/frontend/utils/player-labels';
import styles from './RankingFilters.module.scss';

interface Props {
  selection: RankingSelection;
  onChange: (selection: RankingSelection) => void;
  onClear: () => void;
}

export default function RankingFilters({ selection, onChange, onClear }: Props) {
  const [teamInput, setTeamInput] = useState(selection.team ?? '');
  const submitTeam = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onChange({ ...selection, team: teamInput.trim() || undefined, page: 1 });
  };

  return (
    <section className={styles.panel} aria-label="Filtros del ranking">
      <label>
        <span className={styles.labelText}><Trophy size={15} aria-hidden="true" />Liga</span>
        <select value={selection.league ?? ''} onChange={(event) => onChange({ ...selection, league: event.target.value ? event.target.value as League : undefined, page: 1 })}>
          <option value="">Todas las ligas</option>
          {Object.values(League).map((league) => <option key={league} value={league}>{leagueLabels[league]}</option>)}
        </select>
      </label>
      <form onSubmit={submitTeam} className={styles.teamForm}>
        <label className={styles.labelText} htmlFor="ranking-team"><Shield size={15} aria-hidden="true" />Equipo</label>
        <div className={styles.teamInput}>
          <Search size={17} aria-hidden="true" />
          <input id="ranking-team" name="team" type="search" value={teamInput} onChange={(event) => setTeamInput(event.target.value)} placeholder="Nombre o parte del equipo" />
          <button type="submit">Buscar</button>
        </div>
      </form>
      <label>
        <span className={styles.labelText}><Target size={15} aria-hidden="true" />Posición</span>
        <select value={selection.position ?? ''} onChange={(event) => onChange({ ...selection, position: event.target.value ? event.target.value as Position : undefined, page: 1 })}>
          <option value="">Todas las posiciones</option>
          {Object.values(Position).map((position) => <option key={position} value={position}>{formatEnumLabel(position)}</option>)}
        </select>
      </label>
      <button className={styles.clear} type="button" onClick={() => { setTeamInput(''); onClear(); }}><RotateCcw size={14} aria-hidden="true" />Limpiar filtros</button>
    </section>
  );
}
