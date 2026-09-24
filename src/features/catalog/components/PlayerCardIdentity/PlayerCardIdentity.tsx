import { Shield } from "lucide-react";
import { IoFootballSharp } from "react-icons/io5";
import type { CatalogPlayer } from "@/catalog/player-catalog";
import { Position } from "@/models/enums";
import styles from "./PlayerCardIdentity.module.scss";

interface PlayerCardIdentityProps {
  player: CatalogPlayer;
}

const formatLabel = (value: string) => value
  .toLowerCase()
  .replaceAll("_", " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const positionStyles: Record<Position, string> = {
  [Position.UNKNOWN]: styles.positionUnknown,
  [Position.GOALKEEPER]: styles.positionGoalkeeper,
  [Position.DEFENDER]: styles.positionDefender,
  [Position.MIDFIELDER]: styles.positionMidfielder,
  [Position.FORWARD]: styles.positionForward,
};

export default function PlayerCardIdentity({ player }: PlayerCardIdentityProps) {
  return (
    <div className={styles.identity}>
      <h2>{player.name}</h2>
      <div className={styles.detail}>
        <span className={styles.detailIcon} aria-hidden="true"><Shield size={13} /></span>
        <span>{player.team}</span>
      </div>
      <div className={styles.detail}>
        <span className={styles.detailIcon} aria-hidden="true"><IoFootballSharp size={13} /></span>
        <span>{formatLabel(player.league)}</span>
      </div>
      <div className={styles.tags}>
        <span className={positionStyles[player.position]}>
          {formatLabel(player.position)}
        </span>
      </div>
    </div>
  );
}
