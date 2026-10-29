import Link from "next/link";
import type { PortfolioSnapshot } from "@/frontend/services/client/player-trading.service";
import type { PlayerApiDetail } from "@/frontend/services/client/player.service";
import { formatCredits } from "../portfolio";
import { PortfolioPlayer } from "./PortfolioPlayer";
import styles from "@/app/portfolio/PortfolioPage.module.scss";

export function PortfolioPnlChart({ snapshot, names, players = {} }: { snapshot: PortfolioSnapshot; names: Record<string, string>; players?: Record<string, PlayerApiDetail> }) {
  const known = snapshot.items.filter((item) => item.unrealizedPnl !== null);
  const missing = snapshot.items.filter((item) => item.unrealizedPnl === null);
  const max = Math.max(0, ...known.map((item) => Math.abs(item.unrealizedPnl ?? 0)));
  return <section aria-labelledby="portfolio-pnl-title" className={styles.chartSection}>
    <h2 id="portfolio-pnl-title">Ganancia o pérdida por jugador</h2>
    {known.length > 0 && <p className={styles.chartDescription}>Las pérdidas aparecen a la izquierda del cero y las ganancias a la derecha.</p>}
    {known.length === 0 && <p>No hay datos de ganancia o pérdida para comparar.</p>}
    {known.length > 0 && max === 0 && <p>La ganancia o pérdida de todos los jugadores disponibles es cero.</p>}
    {known.length > 0 && <div className={styles.pnlAxis} aria-hidden="true"><div className={styles.axisTrack}><span>← Pérdida</span><span>0</span><span>Ganancia →</span></div></div>}
    <ul className={styles.chartList}>{known.map((item) => {
      const value = item.unrealizedPnl ?? 0;
      return <li className={styles.chartRow} key={item.playerId}>
        <div className={styles.chartPlayer}><PortfolioPlayer id={item.playerId} name={names[item.playerId] || item.playerId} player={players[item.playerId]} compact /></div>
        <div className={styles.pnlTrack} aria-hidden="true"><span className={value < 0 ? styles.negativeBar : styles.positiveBar}
          style={{ width: `${max > 0 ? Math.abs(value) / max * 50 : 0}%` }} /></div>
        <span className={`${styles.chartAmount} ${value > 0 ? styles.gain : value < 0 ? styles.loss : ""}`}><small>{value > 0 ? "Ganancia" : value < 0 ? "Pérdida" : "Sin variación"}</small>
          {value > 0 ? "+" : ""}{formatCredits(value)}
          <Link className={styles.playerAction} href={`/players/${encodeURIComponent(item.playerId)}`}>
            Ver jugador
          </Link>
        </span>
      </li>;
    })}</ul>
    {missing.length > 0 && <><h3>Sin cotización</h3><ul className={styles.missingList}>{missing.map((item) =>
      <li key={item.playerId}>{names[item.playerId] || item.playerId}: sin cotización · <Link className={styles.playerAction} href={`/players/${encodeURIComponent(item.playerId)}`}>Ver jugador</Link></li>)}</ul></>}
  </section>;
}
