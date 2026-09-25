import Link from "next/link";
import { Shield } from "lucide-react";
import { IoFootballSharp } from "react-icons/io5";
import type { PlayerApiDetail } from "@/services/client/player.service";
import PlayerCardImage from "@/features/catalog/components/PlayerCardImage/PlayerCardImage";
import PlayerCardRating from "@/features/catalog/components/PlayerCardRating/PlayerCardRating";
import { Position } from "@/models/enums";
import {
  formatEnumLabel,
  leagueLabels,
} from "@/features/profile/utils/player-profile";
import styles from "./PlayerProfileHeader.module.scss";

interface PlayerProfileHeaderProps {
  player: PlayerApiDetail;
}

const positionStyles: Record<Position, string> = {
  [Position.UNKNOWN]: styles.positionUnknown,
  [Position.GOALKEEPER]: styles.positionGoalkeeper,
  [Position.DEFENDER]: styles.positionDefender,
  [Position.MIDFIELDER]: styles.positionMidfielder,
  [Position.FORWARD]: styles.positionForward,
};

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
            <span className={styles.detail}>
              <Shield aria-hidden="true" size={15} />
              {player.team}
            </span>
            <span className={styles.detail}>
              <IoFootballSharp aria-hidden="true" size={15} />
              {leagueLabels[player.league] ?? formatEnumLabel(player.league)}
            </span>
            <span className={positionStyles[player.position]}>
              {formatEnumLabel(player.position)}
            </span>
          </div>
        </div>
        <PlayerCardRating rating={player.statistics.rating} />
      </div>
    </section>
  );
}
