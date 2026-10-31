import styles from '@/app/comparison/ComparisonPage.module.scss';

export function EmptyComparisonState() {
  return (
    <div className={styles.emptyComparison} role="status">
      <div className={styles.emptyIllustration} aria-hidden="true">
        <div className={`${styles.emptyPlayerCard} ${styles.emptyPlayerLeft}`}>
          <span className={styles.emptyPerson} />
        </div>
        <div className={styles.emptyVersus}>
          <span className={styles.emptyBars}>
            <span />
            <span />
            <span />
          </span>
          <strong>VS</strong>
        </div>
        <div className={`${styles.emptyPlayerCard} ${styles.emptyPlayerRight}`}>
          <span className={styles.emptyPerson} />
        </div>
      </div>
      <h2>Todavía no seleccionaste jugadores</h2>
      <p>Buscá jugadores para comenzar.</p>
    </div>
  );
}
