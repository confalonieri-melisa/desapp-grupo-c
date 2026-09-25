import type { PlayerStatistics } from "@/models/Player";
import styles from "./PlayerCardMetrics.module.scss";

interface PlayerCardMetricsProps {
  statistics: PlayerStatistics;
}

const formatMetric = (value: number | undefined) => value ?? "-";

export default function PlayerCardMetrics({ statistics }: PlayerCardMetricsProps) {
  const metrics = [
    ["Goles", statistics.goals],
    ["Asist.", statistics.assists],
    ["Apariciones", statistics.appearances],
    ["Minutos", statistics.minutesPlayed],
  ] as const;

  return (
    <dl className={styles.metrics}>
      {metrics.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{formatMetric(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
