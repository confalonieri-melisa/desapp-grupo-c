'use client';

import Image from 'next/image';
import { BarChart3, CircleDollarSign, Shield, Star, UserRound, UsersRound, X } from 'lucide-react';
import {
  buildComparisonRows,
  formatComparisonValue,
  type ComparisonPlayer,
  type ComparisonRowKey,
} from '@/frontend/features/comparison/comparison';
import { getPlayerImage } from '@/frontend/utils/image-mapper';
import { formatEnumLabel, leagueLabels } from '@/frontend/utils/player-labels';
import styles from '@/app/comparison/ComparisonPage.module.scss';

const metricIcons = {
  currentQuote: CircleDollarSign,
  variation: BarChart3,
  individualScore: UserRound,
  teamScore: UsersRound,
  finalScore: Star,
} satisfies Record<ComparisonRowKey, typeof Star>;

interface Props {
  players: readonly ComparisonPlayer[];
  onRemove: (id: string) => void;
}

export default function ComparisonMatrix({ players, onRemove }: Props) {
  const rows = buildComparisonRows(players);

  return (
    <div className={styles.matrixWrapper}>
      <table className={styles.matrix}>
        <caption className={styles.srOnly}>
          Comparación de jugadores seleccionados
        </caption>
        <thead>
          <tr>
            <th scope="col" className={styles.metricHeading}>Métrica</th>
            {players.map((player) => (
              <th scope="col" key={player.id}>
                <div className={styles.playerHeader}>
                  <span className={styles.playerAvatar}>
                    <Image
                      src={getPlayerImage(player.id, player.imageUrl)}
                      alt=""
                      fill
                      sizes="64px"
                    />
                  </span>
                  <div className={styles.playerDetails}>
                    <strong>{player.name}</strong>
                    <small>
                      <Shield aria-hidden="true" size={13} />
                      {player.team} · {leagueLabels[player.league] ?? formatEnumLabel(player.league)}
                    </small>
                  </div>
                  <button
                    type="button"
                    aria-label={`Quitar a ${player.name}`}
                    onClick={() => onRemove(player.id)}
                  >
                    <X aria-hidden="true" size={18} />
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        {players.length >= 2 && (
          <tbody>
            {rows.map((row) => {
              const MetricIcon = metricIcons[row.key];
              return (
                <tr key={row.key}>
                  <th scope="row">
                    <span className={styles.metricLabel}>
                      <MetricIcon className={styles.metricIcon} aria-hidden="true" size={22} />
                      <span>{row.label}</span>
                    </span>
                  </th>
                  {row.values.map((value, index) => (
                    <td key={`${row.key}-${players[index]?.id}`}>
                      {value === null ? (
                        <span className={styles.unavailable}>No disponible</span>
                      ) : row.key === 'finalScore' ? (
                        <strong className={styles.finalScore}>{formatComparisonValue(value, row.key)}</strong>
                      ) : row.key === 'variation' ? (
                        <strong className={Number(value) >= 0 ? styles.positive : styles.negative}>
                          {formatComparisonValue(value, row.key)}
                        </strong>
                      ) : (
                        <span>
                          {formatComparisonValue(value, row.key)}
                          {row.key === 'currentQuote' && <small> créditos</small>}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        )}
      </table>
    </div>
  );
}
