import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Crown } from 'lucide-react';
import type { RankingEntry } from '@/frontend/features/ranking/ranking';
import { getPlayerImage } from '@/frontend/utils/image-mapper';
import { formatEnumLabel, leagueLabels } from '@/frontend/utils/player-labels';
import { formatQuoteValueDisplay } from '@/frontend/features/profile/utils/player-quotes';
import styles from './RankingList.module.scss';

const leagueFlags: Record<string, string> = { PREMIER_LEAGUE: '🇬🇧', BUNDESLIGA: '🇩🇪', LA_LIGA: '🇪🇸', SERIE_A: '🇮🇹', LIGUE_1: '🇫🇷' };

export default function RankingList({ players }: { players: readonly RankingEntry[] }) {
  return <div className={styles.table}>
    <div className={styles.tableHead} aria-hidden="true"><span>#</span><span>Jugador</span><span>Equipo</span><span>Liga</span><span>Posición</span><span>Puntaje final</span><span>Cotización <small>(créditos por token)</small></span><span>Acciones</span></div>
    <ol className={styles.list} aria-label="Ranking de jugadores">
      {players.map((entry) => <li key={entry.player.id} className={styles.entry}>
        <div className={`${styles.rank} ${entry.rank <= 3 ? styles[`rank${entry.rank}`] : ''}`} aria-label={`Puesto ${entry.rank}`}>{entry.rank === 1 && <Crown className={styles.crown} size={15} fill="currentColor" aria-hidden="true" />}{entry.rank}</div>
        <div className={styles.identity}><div className={styles.avatar}><Image src={getPlayerImage(entry.player.id)} alt="" fill sizes="48px" /></div><div className={styles.identityText}><Link href={`/players/${encodeURIComponent(entry.player.id)}`}>{entry.player.name}</Link><span className={styles.mobileTeam}>{entry.player.team}</span></div></div>
        <span className={styles.team}>{entry.player.team}</span>
        <span className={styles.league}><span aria-hidden="true">{leagueFlags[entry.player.league]}</span>{leagueLabels[entry.player.league]}</span>
        <span className={`${styles.position} ${styles[entry.player.position.toLowerCase()]}`}>{formatEnumLabel(entry.player.position)}</span>
        <div className={styles.score}><strong>{formatQuoteValueDisplay(entry.finalScore)}</strong></div>
        <div className={styles.quote}><strong>{formatQuoteValueDisplay(entry.quoteValue)}</strong></div>
        <Link className={styles.view} href={`/players/${encodeURIComponent(entry.player.id)}`}>Ver <ArrowRight size={14} aria-hidden="true" /></Link>
      </li>)}
    </ol>
  </div>;
}
