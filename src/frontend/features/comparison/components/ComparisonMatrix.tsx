'use client';

import Image from 'next/image';
import { X } from 'lucide-react';
import {
  buildComparisonRows,
  formatComparisonValue,
  type ComparisonPlayer,
} from '@/frontend/features/comparison/comparison';
import { getPlayerImage } from '@/frontend/utils/image-mapper';
import styles from '@/app/comparison/ComparisonPage.module.scss';

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
            <th scope="col">Métrica</th>
            {players.map((player) => (
              <th scope="col" key={player.id}>
                <div className={styles.playerHeader}>
                  <Image
                    src={getPlayerImage(player.id)}
                    alt=""
                    width={56}
                    height={56}
                  />
                  <div>
                    <strong>{player.name}</strong>
                    <small>
                      {player.team} · {player.league}
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
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                {row.values.map((value, index) => (
                  <td key={`${row.key}-${players[index]?.id}`}>
                    {formatComparisonValue(value, row.key)}
                    {row.key === 'currentQuote' && value !== null && (
                      <small> créditos</small>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}
