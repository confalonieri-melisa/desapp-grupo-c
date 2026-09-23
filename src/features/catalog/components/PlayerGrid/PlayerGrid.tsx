import type { CatalogPlayer } from "@/catalog/player-catalog";
import PlayerCard from "@/features/catalog/components/PlayerCard/PlayerCard";
import styles from "./PlayerGrid.module.scss";

interface PlayerGridProps {
  players: readonly CatalogPlayer[];
}

export default function PlayerGrid({ players }: PlayerGridProps) {
  return (
    <div className={styles.grid}>
      {players.map((player) => <PlayerCard key={player.id} player={player} />)}
    </div>
  );
}
