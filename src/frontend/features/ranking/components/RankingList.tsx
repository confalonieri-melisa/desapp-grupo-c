import Link from 'next/link';
import type { RankingEntry } from '@/frontend/features/ranking/ranking';
import { formatEnumLabel, leagueLabels } from '@/frontend/utils/player-labels';
import { formatQuoteTimestampDisplay, formatQuoteValueDisplay } from '@/frontend/features/profile/utils/player-quotes';
import styles from './RankingList.module.scss';

export default function RankingList({ players }: { players: readonly RankingEntry[] }) {
  return (
    <ol className={styles.list} aria-label="Ranking de jugadores">
      {players.map((entry) => (
        <li key={entry.player.id} className={styles.entry}>
          <div className={styles.rank}>Puesto {entry.rank}</div>
          <div className={styles.identity}>
            <Link href={`/players/${encodeURIComponent(entry.player.id)}`}>{entry.player.name}</Link>
            <span>{entry.player.team} · {leagueLabels[entry.player.league]} · {formatEnumLabel(entry.player.position)}</span>
          </div>
          <div className={styles.metrics}>
            <p><span>Puntaje final</span><strong>{formatQuoteValueDisplay(entry.finalScore)}</strong></p>
            <p><span>Cotización</span><strong>{formatQuoteValueDisplay(entry.quoteValue)} {entry.unit === 'CREDIT_PER_TOKEN' ? 'créditos por token' : entry.unit}</strong></p>
            <p><span>Calculada el</span><time dateTime={entry.calculatedAt}>{formatQuoteTimestampDisplay(entry.calculatedAt)} UTC</time></p>
          </div>
        </li>
      ))}
    </ol>
  );
}
