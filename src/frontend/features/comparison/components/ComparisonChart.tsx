'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  buildQuoteSeries,
  type ComparisonPlayer,
} from '@/frontend/features/comparison/comparison';
import styles from '@/app/comparison/ComparisonPage.module.scss';

const colors = ['#d64282', '#7c3aed', '#fc8439'];

const formatValue = (value: number) =>
  `${new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 4,
  }).format(value)} créditos por token`;

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(timestamp);

export default function ComparisonChart({
  players,
}: {
  players: readonly ComparisonPlayer[];
}) {
  const series = players.map(buildQuoteSeries);
  const ready = series.filter((item) => item.phase === 'ready');
  const timestamps = [
    ...new Set(
      ready.flatMap((item) => item.points.map((point) => point.timestamp)),
    ),
  ].sort((a, b) => a - b);
  const data = timestamps.map((timestamp) => ({
    timestamp,
    ...Object.fromEntries(
      ready.map((item) => [
        item.playerId,
        item.points.find((point) => point.timestamp === timestamp)?.value,
      ]),
    ),
  }));

  return (
    <section
      className={styles.chart}
      aria-labelledby="comparison-chart-title"
    >
      <h2 id="comparison-chart-title">Evolución de cotizaciones</h2>

      {ready.length === 0 && (
        <p role="status">
          No hay suficientes cotizaciones históricas para mostrar una evolución.
        </p>
      )}

      {ready.length > 0 && (
        <>
          <div
            className={styles.chartCanvas}
            role="img"
            aria-label={ready
              .map((item) => {
                const first = item.points[0];
                const last = item.points[item.points.length - 1];

                return `${item.playerName}: ${formatValue(first.value)} el ${formatDate(first.timestamp)} a ${formatValue(last.value)} el ${formatDate(last.timestamp)}`;
              })
              .join('. ')}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={data}
                margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  stroke="#eadde6"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={formatDate}
                  tick={{ fill: '#625b73', fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(value: number) =>
                    new Intl.NumberFormat('es-AR', {
                      maximumFractionDigits: 2,
                    }).format(value)
                  }
                  tick={{ fill: '#625b73', fontSize: 11 }}
                />
                <Tooltip
                  labelFormatter={(value) => formatDate(Number(value))}
                  formatter={(value) => [formatValue(Number(value)), 'Cotización']}
                />
                <Legend />
                {ready.map((item, index) => (
                  <Line
                    key={item.playerId}
                    type="monotone"
                    dataKey={item.playerId}
                    name={item.playerName}
                    stroke={colors[index]}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <ul className={styles.chartStatuses}>
            {series
              .filter((item) => item.phase === 'insufficient')
              .map((item) => (
                <li key={item.playerId}>
                  {item.playerName}: no hay suficientes datos históricos.
                </li>
              ))}
          </ul>
        </>
      )}

      {players
        .filter((player) => player.history.phase === 'error')
        .map((player) => (
          <p role="alert" key={player.id}>
            {player.name}:{' '}
            {player.history.error ?? 'No se pudieron cargar las cotizaciones.'}
          </p>
        ))}
    </section>
  );
}
