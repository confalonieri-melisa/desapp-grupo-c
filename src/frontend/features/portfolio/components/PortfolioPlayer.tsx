import Image from "next/image";
import type { PlayerApiDetail } from "@/frontend/services/client/player.service";
import { getPlayerImage } from "@/frontend/utils/image-mapper";
import { formatEnumLabel, leagueLabels } from "@/frontend/utils/player-labels";
import styles from "@/app/portfolio/PortfolioPage.module.scss";

export function PortfolioPlayer({ id, name, player, compact = false }: {
  id: string;
  name: string;
  player?: PlayerApiDetail;
  compact?: boolean;
}) {
  return <div className={`${styles.playerIdentity} ${compact ? styles.playerIdentityCompact : ""}`}>
    <span className={styles.playerAvatar}><Image src={getPlayerImage(id)} alt="" fill sizes="48px" /></span>
    <span className={styles.playerIdentityText}>
      <strong>{name}</strong>
      {!compact && player && <small>{player.team} <span aria-hidden="true">·</span> {leagueLabels[player.league] ?? formatEnumLabel(player.league)}</small>}
    </span>
  </div>;
}
