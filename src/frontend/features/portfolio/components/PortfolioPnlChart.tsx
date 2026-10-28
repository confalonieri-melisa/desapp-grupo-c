import Link from "next/link";
import type { PortfolioSnapshot } from "@/frontend/services/client/player-trading.service";
import { formatCredits } from "../portfolio";
import styles from "@/app/portfolio/PortfolioPage.module.scss";

export function PortfolioPnlChart({ snapshot, names }: { snapshot: PortfolioSnapshot; names: Record<string, string> }) {
  const known = snapshot.items.filter((item) => item.unrealizedPnl !== null);
  const missing = snapshot.items.filter((item) => item.unrealizedPnl === null);
  const max = Math.max(0, ...known.map((item) => Math.abs(item.unrealizedPnl ?? 0)));
  return <section aria-labelledby="portfolio-pnl-title" className={styles.chartSection}>
    <h2 id="portfolio-pnl-title">Resultado no realizado por jugador</h2>
    {known.length > 0 && <p className={styles.chartDescription}>La línea central es cero. Las pérdidas van a la izquierda y las ganancias a la derecha.</p>}
    {known.length === 0 && <p>No hay resultados disponibles para comparar.</p>}
    {known.length > 0 && max === 0 && <p>Todos los resultados disponibles son cero.</p>}
    {known.length > 0 && <div className={styles.pnlAxis} aria-hidden="true"><span>← Pérdida</span><span>0</span><span>Ganancia →</span></div>}
    <ul className={styles.chartList}>{known.map((item) => {
      const value = item.unrealizedPnl ?? 0;
      return <li className={styles.chartRow} key={item.playerId}>
        <strong className={styles.chartPlayer}>{names[item.playerId] || item.playerId}</strong>
        <div className={styles.pnlTrack} aria-hidden="true"><span className={value < 0 ? styles.negativeBar : styles.positiveBar}
          style={{ width: `${max > 0 ? Math.abs(value) / max * 50 : 0}%` }} /></div>
        <span className={styles.chartAmount}><small>{value > 0 ? "Ganancia" : value < 0 ? "Pérdida" : "Sin variación"}</small>
          {value > 0 ? "+" : ""}{formatCredits(value)}
          <Link className={styles.playerAction} href={`/players/${encodeURIComponent(item.playerId)}`}>
            {value > 0 ? "Ver jugador y vender" : "Ver jugador"}
          </Link>
        </span>
      </li>;
    })}</ul>
    {missing.length > 0 && <><h3>Sin cotización</h3><ul className={styles.missingList}>{missing.map((item) =>
      <li key={item.playerId}>{names[item.playerId] || item.playerId}: sin cotización · <Link className={styles.playerAction} href={`/players/${encodeURIComponent(item.playerId)}`}>Ver jugador</Link></li>)}</ul></>}
  </section>;
}
