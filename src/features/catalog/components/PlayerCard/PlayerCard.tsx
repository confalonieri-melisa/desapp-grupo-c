import type { CatalogPlayer } from "@/catalog/player-catalog";
import styles from "./PlayerCard.module.scss";
import PlayerCardImage from "@/features/catalog/components/PlayerCardImage/PlayerCardImage";
import PlayerCardIdentity from "@/features/catalog/components/PlayerCardIdentity/PlayerCardIdentity";
import PlayerCardRating from "@/features/catalog/components/PlayerCardRating/PlayerCardRating";
import PlayerCardMetrics from "@/features/catalog/components/PlayerCardMetrics/PlayerCardMetrics";

interface PlayerCardProps {
  player: CatalogPlayer;
}

export default function PlayerCard({ player }: PlayerCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.summary}>
        <PlayerCardImage playerName={player.name} />
        <PlayerCardIdentity player={player} />
        <PlayerCardRating rating={player.statistics.rating} />
      </div>
      <PlayerCardMetrics statistics={player.statistics} />
    </article>
  );
}
