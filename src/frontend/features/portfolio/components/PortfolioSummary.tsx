import type { PortfolioSnapshot } from "@/frontend/services/client/player-trading.service";
import { ChartNoAxesColumn, Coins, Gem, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { derivePortfolioSummary, formatCredits, type MetricAggregate } from "../portfolio";
import styles from "@/app/portfolio/PortfolioPage.module.scss";

function Metric({ label, metric, icon }: { label: string; metric: MetricAggregate; icon: ReactNode }) {
  return <div className={styles.summaryCard}>
    <span className={styles.summaryIcon} aria-hidden="true">{icon}</span>
    <div className={styles.summaryText}><dt>{label}</dt><dd>{formatCredits(metric.value)}</dd>
      {metric.status === "partial" && <p>Parcial: {metric.excludedCount} {metric.excludedCount === 1 ? "posición excluida" : "posiciones excluidas"}</p>}
      {metric.status === "unavailable" && <p>No disponible: {metric.excludedCount} {metric.excludedCount === 1 ? "posición sin cotización" : "posiciones sin cotización"}</p>}
    </div>
  </div>;
}

export function PortfolioSummary({ snapshot }: { snapshot: PortfolioSnapshot }) {
  const summary = derivePortfolioSummary(snapshot);
  return <section aria-labelledby="portfolio-summary-title">
    <h2 id="portfolio-summary-title" className={styles.visuallyHidden}>Resumen</h2>
    <dl className={styles.summaryGrid}>
      <div className={styles.summaryCard}><span className={styles.summaryIcon} aria-hidden="true"><Coins size={23} /></span><div className={styles.summaryText}><dt>Saldo disponible</dt><dd>{formatCredits(snapshot.creditBalance)}</dd></div></div>
      <Metric label="Valor de tenencias" metric={summary.holdingsValue} icon={<TrendingUp size={23} />} />
      <Metric label="Ganancia o pérdida" metric={summary.unrealizedTotal} icon={<ChartNoAxesColumn size={23} />} />
      <Metric label="Patrimonio estimado" metric={summary.estimatedWorth} icon={<Gem size={23} />} />
    </dl>
  </section>;
}
