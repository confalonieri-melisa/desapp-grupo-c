import { useEffect } from "react";
import { toast } from "react-toastify";
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

export default function PlayerOrderFeedback({
  playerId,
  playerName,
  portfolio,
  order,
  retryPortfolio,
  submittingRef,
  resultRef,
}: PlayerOrderFeedbackProps) {
  const receipt = order.status === "succeeded" ? order.receipt : undefined;
  useEffect(() => {
    if (!receipt) return;
    const op = receipt.operation;
    toast.success(
      `${op.type === "BUY" ? "Compra" : "Venta"} confirmada de ${order.playerName ?? playerName}: ${formatTradingNumber(op.quantity)} tokens · Total ${formatCredits(op.total)}`,
      { toastId: `pool-${op.id}` },
    );
  }, [receipt, order.playerName, playerName]);
  return (
    <>
      {order.status === "submitting" && (
        <p ref={submittingRef} tabIndex={-1} className={styles.orderStatus} role="status">
          Enviando orden de {order.playerName ?? playerName}…
        </p>
      )}
      {order.status === "succeeded" &&
        order.playerId === playerId &&
        portfolio.status === "error" && (
          <div className={styles.orderStatus} role="alert">
            La operación se confirmó, pero el portfolio aún no pudo actualizarse.{" "}
            <button type="button" onClick={retryPortfolio}>
              Consultar portfolio
            </button>
          </div>
        )}
      {(order.status === "rejected" || order.status === "uncertain") && (
        <div ref={resultRef} tabIndex={-1} className={styles.orderStatus} role="alert">
          <h3>Resultado de la orden para {order.playerName ?? playerName}</h3>
          <p>{order.error}</p>
          {order.status === "uncertain" && (
            <p>
              La orden podría haberse procesado. Consultá el portfolio antes de intentar otra vez.
            </p>
          )}
          <button type="button" onClick={retryPortfolio}>
            Consultar portfolio
          </button>
        </div>
      )}
    </>
  );
}
