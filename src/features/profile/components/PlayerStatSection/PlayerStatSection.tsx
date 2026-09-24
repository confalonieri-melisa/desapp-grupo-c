import type { PlayerStatistics } from "@/models/Player";
import { formatStatistic } from "@/features/profile/utils/player-profile";
import styles from "./PlayerStatSection.module.scss";

interface PlayerStatSectionProps {
  title: string;
  statistics: PlayerStatistics;
  items: readonly (readonly [string, keyof PlayerStatistics])[];
}

export default function PlayerStatSection({
  title,
  statistics,
  items,
}: PlayerStatSectionProps) {
  return (
    <section className={styles.section} aria-labelledby={`${title}-title`}>
      <h2 id={`${title}-title`}>{title}</h2>
      <dl className={styles.grid}>
        {items.map(([label, key]) => (
          <div className={styles.stat} key={key}>
            <dt>{label}</dt>
            <dd>{formatStatistic(statistics[key])}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
