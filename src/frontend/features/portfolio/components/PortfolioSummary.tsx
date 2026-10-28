import type { PortfolioSnapshot } from "@/frontend/services/client/player-trading.service";
import { derivePortfolioSummary, formatCredits, type MetricAggregate } from "../portfolio";
import styles from "@/app/portfolio/PortfolioPage.module.scss";

function Metric({ label, metric }: { label: string; metric: MetricAggregate }) {
  return <div className={styles.summaryCard}>
    <dt>{label}</dt><dd>{formatCredits(metric.value)}</dd>
    {metric.status === "partial" && <p>Parcial: {metric.excludedCount} {metric.excludedCount === 1 ? "posición excluida" : "posiciones excluidas"}</p>}
    {metric.status === "unavailable" && <p>No disponible: {metric.excludedCount} {metric.excludedCount === 1 ? "posición sin cotización" : "posiciones sin cotización"}</p>}
  </div>;
}

export function PortfolioSummary({ snapshot }: { snapshot: PortfolioSnapshot }) {
  const summary = derivePortfolioSummary(snapshot);
  return <section aria-labelledby="portfolio-summary-title">
    <h2 id="portfolio-summary-title">Resumen</h2>
    <dl className={styles.summaryGrid}>
      <div className={styles.summaryCard}><dt>Saldo disponible</dt><dd>{formatCredits(snapshot.creditBalance)}</dd></div>
      <Metric label="Valor de tenencias" metric={summary.holdingsValue} />
      <Metric label="Resultado no realizado" metric={summary.unrealizedTotal} />
      <Metric label="Patrimonio estimado" metric={summary.estimatedWorth} />
    </dl>
  </section>;
}
