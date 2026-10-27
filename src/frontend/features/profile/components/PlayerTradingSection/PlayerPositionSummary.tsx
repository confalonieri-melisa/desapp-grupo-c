import type { PlayerPositionSelection } from "../../utils/player-trading";
import { formatCredits, formatTradingNumber } from "../../utils/player-trading";
import styles from "./PlayerTradingSection.module.scss";

interface PlayerPositionSummaryProps {
  playerName: string;
  selected: PlayerPositionSelection;
}

export default function PlayerPositionSummary({ playerName, selected }: PlayerPositionSummaryProps) {
  const { position } = selected;
  return <div className={styles.position}>
    <div className={styles.positionHeading}>
      <h3>Mis tokens de {playerName}</h3>
      {selected.isPortfolioEmpty && <p role="status">Tu portfolio está vacío.</p>}
      {!selected.isPortfolioEmpty && !position && <p>Sin tokens de este jugador.</p>}
    </div>
    <dl className={styles.metrics}>
      <div><dt>Cantidad</dt><dd>{formatTradingNumber(selected.quantity)} tokens</dd></div>
      <div><dt>Precio promedio de compra</dt><dd>{position ? formatCredits(position.averagePurchasePrice) : "No disponible"}</dd></div>
      <div><dt>Cotización actual de la posición</dt><dd>{position ? formatCredits(position.currentQuoteValue) : "No disponible"}</dd></div>
      <div><dt>Valor actual</dt><dd>{position ? formatCredits(position.currentValue) : "No disponible"}</dd></div>
      <div><dt>PnL no realizado</dt><dd>{position ? formatCredits(position.unrealizedPnl) : "No disponible"}</dd></div>
    </dl>
  </div>;
}
