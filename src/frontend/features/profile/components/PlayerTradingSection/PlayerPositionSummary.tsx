import type { PlayerPositionSelection } from "../../utils/player-trading";
import { formatCredits, formatTradingNumber } from "../../utils/player-trading";
import styles from "./PlayerTradingSection.module.scss";

interface PlayerPositionSummaryProps {
  playerName: string;
  selected: PlayerPositionSelection;
}

export default function PlayerPositionSummary({
  playerName,
  selected,
}: PlayerPositionSummaryProps) {
  const { position } = selected;
  return (
    <div className={styles.position}>
      <div className={styles.positionHeading}>
        <h3>Mis tokens de {playerName}</h3>
        {selected.isPortfolioEmpty && <p role="status">Tu portfolio está vacío.</p>}
        {!selected.isPortfolioEmpty && !position && <p>Sin tokens de este jugador.</p>}
      </div>
      <dl className={styles.metrics}>
        <div>
          <dt>
            <Coins size={16} aria-hidden="true" /> Cantidad
          </dt>
          <dd>{formatTradingNumber(selected.quantity)} tokens</dd>
        </div>
        <div>
          <dt>
            <ChartColumn size={16} aria-hidden="true" /> Precio promedio de compra
          </dt>
          <dd>{position ? formatCredits(position.averagePurchasePrice) : "No disponible"}</dd>
        </div>
        <div>
          <dt>
            <CircleDollarSign size={16} aria-hidden="true" /> Cotización actual de la posición
          </dt>
          <dd>{position ? formatCredits(position.currentQuoteValue) : "No disponible"}</dd>
        </div>
        <div>
          <dt>
            <Wallet size={16} aria-hidden="true" /> Valor actual
          </dt>
          <dd>{position ? formatCredits(position.currentValue) : "No disponible"}</dd>
        </div>
        <div>
          <dt>
            <TrendingUp size={16} aria-hidden="true" /> PnL no realizado
          </dt>
          <dd>{position ? formatCredits(position.unrealizedPnl) : "No disponible"}</dd>
        </div>
      </dl>
    </div>
  );
}
import { ChartColumn, Coins, TrendingUp, Wallet, CircleDollarSign } from "lucide-react";
