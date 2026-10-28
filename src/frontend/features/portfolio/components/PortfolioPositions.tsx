import type { PortfolioSnapshot } from "@/frontend/services/client/player-trading.service";
import { formatCredits, formatNumber } from "../portfolio";
import styles from "@/app/portfolio/PortfolioPage.module.scss";

export function PortfolioPositions({ snapshot, names }: { snapshot: PortfolioSnapshot; names: Record<string, string> }) {
  return <section aria-labelledby="portfolio-positions-title">
    <div className={styles.sectionHeading}><div><h2 id="portfolio-positions-title">Mis jugadores</h2><p>Detalle de tus tenencias actuales</p></div>
      <span className={styles.positionCount}>{snapshot.items.length} {snapshot.items.length === 1 ? "posición" : "posiciones"}</span></div>
    {snapshot.items.length === 0 ? <p>No tenés posiciones en tu portfolio.</p> :
      <div className={styles.positionTable}>
        <div className={styles.positionHeader} aria-hidden="true"><span>Jugador</span><span>Tenencia</span><span>Precio promedio</span><span>Cotización</span><span>Valor actual</span><span>Resultado no realizado</span></div>
        <ul className={styles.positionList}>{snapshot.items.map((item) => <li className={styles.positionRow} key={item.playerId}>
          <div className={styles.positionPlayer}><strong>{names[item.playerId] || item.playerId}</strong>
            {names[item.playerId] && <small>ID: {item.playerId}</small>}</div>
          <dl className={styles.positionMetrics}>
            <div><dt>Tenencia</dt><dd>{formatNumber(item.quantity)} tokens</dd></div>
            <div><dt>Precio promedio</dt><dd>{formatCredits(item.averagePurchasePrice)}</dd></div>
            <div><dt>Cotización</dt><dd>{formatCredits(item.currentQuoteValue)}</dd></div>
            <div><dt>Valor actual</dt><dd>{formatCredits(item.currentValue)}</dd></div>
            <div><dt>Resultado no realizado</dt><dd>{formatCredits(item.unrealizedPnl)}</dd></div>
          </dl>
        </li>)}</ul>
      </div>}
  </section>;
}
