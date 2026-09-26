import { League, Position } from "@/models/enums";
import { CircleDot, RotateCcw, Shield, SlidersHorizontal } from "lucide-react";
import { IoFootballSharp } from "react-icons/io5";
import type { PlayerCatalogFilters } from "@/catalog/player-catalog";
import PlayerFilterSelect from "@/features/catalog/components/PlayerFilterSelect/PlayerFilterSelect";
import styles from "./PlayerFilters.module.scss";
import { formatEnumLabel } from "@/utils/player-labels";

interface PlayerFiltersProps {
  filters: PlayerCatalogFilters;
  leagues: readonly League[];
  teams: readonly string[];
  positions: readonly Position[];
  onChange: (filters: PlayerCatalogFilters) => void;
  onReset: () => void;
}

export default function PlayerFilters({
  filters,
  leagues,
  teams,
  positions,
  onChange,
  onReset,
}: PlayerFiltersProps) {
  return (
    <section className={styles.panel} aria-labelledby="filters-title">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <SlidersHorizontal aria-hidden="true" size={22} />
          <h2 id="filters-title">Filtros</h2>
        </div>
        <button className={styles.resetButton} type="button" onClick={onReset}>
          <RotateCcw aria-hidden="true" size={15} />
          Limpiar filtros
        </button>
      </div>

      <div className={styles.fields}>
        <PlayerFilterSelect
          id="league-filter"
          label="Liga"
          icon={<IoFootballSharp aria-hidden="true" size={18} />}
          value={filters.league}
          placeholder="Todas las ligas"
          options={leagues.map((league) => ({
            value: league,
            label: formatEnumLabel(league),
          }))}
          onChange={(value) => onChange({
            ...filters,
            league: value as League | "",
          })}
        />
        <PlayerFilterSelect
          id="team-filter"
          label="Equipo"
          icon={<Shield aria-hidden="true" size={18} />}
          value={filters.team}
          placeholder="Todos los equipos"
          options={teams.map((team) => ({value: team, label: team}))}
          onChange={(value) => onChange({...filters, team: value})}
        />
        <PlayerFilterSelect
          id="position-filter"
          label="Posición"
          icon={<CircleDot aria-hidden="true" size={18} />}
          value={filters.position}
          placeholder="Todas las posiciones"
          options={positions.map((position) => ({
            value: position,
            label: formatEnumLabel(position),
          }))}
          onChange={(value) => onChange({
            ...filters,
            position: value as Position | "",
          })}
        />
      </div>
    </section>
  );
}
