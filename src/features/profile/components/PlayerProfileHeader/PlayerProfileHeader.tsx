import Link from "next/link";
import type { PlayerApiDetail } from "@/services/client/player.service";
import PlayerCardImage from "@/features/catalog/components/PlayerCardImage/PlayerCardImage";
import {
  formatEnumLabel,
  leagueLabels,
  positionLabels,
} from "@/features/profile/utils/player-profile";
import styles from "./PlayerProfileHeader.module.scss";

interface PlayerProfileHeaderProps {
  player: PlayerApiDetail;
}

export default function PlayerProfileHeader({ player }: PlayerProfileHeaderProps) {
  return (
    <section className={styles.header}>
      <Link className={styles.backLink} href="/players">← Volver a jugadores</Link>
      <div className={styles.identity}>
        <PlayerCardImage playerId={player.id} playerName={player.name} />
        <div>
          <p className={styles.eyebrow}>Perfil del jugador</p>
          <h1>{player.name}</h1>
          <div className={styles.details}>
            <span>{player.team}</span>
            <span>{leagueLabels[player.league] ?? formatEnumLabel(player.league)}</span>
            <span className={styles.position}>{positionLabels[player.position] ?? formatEnumLabel(player.position)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
