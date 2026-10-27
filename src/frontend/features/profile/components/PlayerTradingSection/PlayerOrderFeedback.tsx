import type { usePlayerTrading } from "../../hooks/usePlayerTrading";
import { formatCredits, formatTradingNumber } from "../../utils/player-trading";
import styles from "./PlayerTradingSection.module.scss";

interface PlayerOrderFeedbackProps {
  playerId: string;
  playerName: string;
  portfolio: ReturnType<typeof usePlayerTrading>["portfolio"];
  order: ReturnType<typeof usePlayerTrading>["order"];
  retryPortfolio: () => void;
  submittingRef: React.RefObject<HTMLParagraphElement | null>;
  resultRef: React.RefObject<HTMLDivElement | null>;
}

export default function PlayerOrderFeedback({ playerId, playerName, portfolio, order, retryPortfolio, submittingRef, resultRef }: PlayerOrderFeedbackProps) {
  return <>
    {order.status === "submitting" && <p ref={submittingRef} tabIndex={-1} className={styles.orderStatus} role="status">
      Enviando orden de {order.playerName ?? playerName}…
    </p>}
    {order.status === "succeeded" && order.receipt && <div ref={resultRef} tabIndex={-1} className={styles.orderStatus} role="status">
      <h3>{order.receipt.operation.type === "BUY" ? "Compra" : "Venta"} confirmada de {order.playerName ?? playerName}</h3>
      <p>{formatTradingNumber(order.receipt.operation.quantity)} tokens a {formatCredits(order.receipt.operation.quoteValue)} por token.</p>
      <p>Total ejecutado: <strong>{formatCredits(order.receipt.operation.total)}</strong></p>
      {order.playerId === playerId && portfolio.status === "refreshing" && <p>Actualizando saldo y tenencia…</p>}
      {order.playerId === playerId && portfolio.status === "error" && <p>La operación se confirmó, pero el portfolio aún no pudo actualizarse.</p>}
    </div>}
    {(order.status === "rejected" || order.status === "uncertain") && <div ref={resultRef} tabIndex={-1} className={styles.orderStatus} role="alert">
      <h3>Resultado de la orden para {order.playerName ?? playerName}</h3>
      <p>{order.error}</p>
      {order.status === "uncertain" && <p>La orden podría haberse procesado. Consultá el portfolio antes de intentar otra vez.</p>}
      <button type="button" onClick={retryPortfolio}>Consultar portfolio</button>
    </div>}
  </>;
}
