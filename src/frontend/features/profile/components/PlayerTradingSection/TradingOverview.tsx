import type { usePlayerQuotes } from "../../hooks/usePlayerQuotes";
import type { usePlayerTrading } from "../../hooks/usePlayerTrading";
import { formatCredits, formatTradingNumber } from "../../utils/player-trading";
import styles from "./PlayerTradingSection.module.scss";

interface TradingOverviewProps {
  quotes: ReturnType<typeof usePlayerQuotes>;
  portfolio: ReturnType<typeof usePlayerTrading>["portfolio"];
  snapshot: ReturnType<typeof usePlayerTrading>["portfolio"]["snapshot"];
  retryPortfolio: () => void;
}

export default function TradingOverview({ quotes, portfolio, snapshot, retryPortfolio }: TradingOverviewProps) {
  return <div className={styles.grid}>
    <div className={styles.panel}>
      <h3>Precio actual</h3>
      {quotes.history.status === "loading" && <p role="status" className={styles.state}>Cargando cotización…</p>}
      {quotes.history.status === "empty" && <p role="status" className={styles.state}>No hay cotización disponible</p>}
      {quotes.history.status === "error" && <p role="alert" className={styles.state}>
        No se pudo cargar la cotización. Podés reintentarla en Cotizaciones.
      </p>}
      {quotes.current && <p className={styles.featureValue}>
        <strong>{formatTradingNumber(quotes.current.quoteValue)}</strong> <span>créditos por token</span>
      </p>}
    </div>
    <div className={styles.panel}>
      <h3>Saldo disponible</h3>
      {(portfolio.status === "idle" || portfolio.status === "loading") &&
        <p role="status" className={styles.state}>Cargando portfolio…</p>}
      {portfolio.status === "refreshing" &&
        <p role="status" className={styles.state}>Actualizando portfolio… Las cifras anteriores aún no están confirmadas.</p>}
      {portfolio.status === "error" && <div role="alert" className={styles.state}>
        <p>No se pudo cargar el portfolio{portfolio.error ? `: ${portfolio.error}` : "."}</p>
        <button type="button" onClick={retryPortfolio}>Reintentar portfolio</button>
      </div>}
      {snapshot && <p className={styles.featureValue}><strong>{formatCredits(snapshot.creditBalance)}</strong></p>}
    </div>
  </div>;
}
