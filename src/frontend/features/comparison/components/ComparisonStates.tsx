import styles from '@/app/comparison/ComparisonPage.module.scss';

export function EmptyComparisonState() {
  return (
    <p className={styles.comparisonState} role="status">
      Buscá y agregá al menos dos jugadores para comparar.
    </p>
  );
}

export function IncompleteComparisonState() {
  return (
    <p className={styles.comparisonState} role="status">
      Falta seleccionar otro jugador para iniciar la comparación.
    </p>
  );
}
