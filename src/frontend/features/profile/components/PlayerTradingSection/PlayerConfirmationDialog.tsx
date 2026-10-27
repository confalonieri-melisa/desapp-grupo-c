import type { usePlayerTrading } from "../../hooks/usePlayerTrading";
import { formatCredits, formatTradingNumber } from "../../utils/player-trading";
import styles from "./PlayerTradingSection.module.scss";

interface PlayerConfirmationDialogProps {
  inputId: string;
  quoteValue?: number;
  trading: ReturnType<typeof usePlayerTrading>;
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  cancelRef: React.RefObject<HTMLButtonElement | null>;
}

export default function PlayerConfirmationDialog({ inputId, quoteValue, trading, dialogRef, cancelRef }: PlayerConfirmationDialogProps) {
  return <dialog ref={dialogRef} className={styles.confirmDialog}
    aria-labelledby={`${inputId}-dialog-title`} aria-describedby={`${inputId}-dialog-description`}
    onCancel={(event) => { event.preventDefault(); trading.cancelConfirmation(); }}>
    {trading.confirmation && <>
      <h3 id={`${inputId}-dialog-title`}>Confirmar {trading.confirmation.type === "BUY" ? "compra" : "venta"}</h3>
      <p id={`${inputId}-dialog-description`}>Revisá los datos antes de enviar la orden para {trading.confirmation.playerName}.</p>
      <dl className={styles.confirmMetrics}>
        <div><dt>Operación</dt><dd>{trading.confirmation.type === "BUY" ? "Compra" : "Venta"}</dd></div>
        <div><dt>Jugador</dt><dd>{trading.confirmation.playerName}</dd></div>
        <div><dt>Cantidad</dt><dd>{formatTradingNumber(trading.confirmation.quantity)} tokens</dd></div>
        <div><dt>Precio por token</dt><dd>{formatCredits(trading.confirmation.quoteValue)} por token</dd></div>
        <div><dt>Total estimado</dt><dd>{formatCredits(trading.confirmation.estimatedTotal)}</dd></div>
      </dl>
      {quoteValue === undefined && <p role="alert">La cotización ya no está disponible. Cancelá y consultá la cotización vigente.</p>}
      <div className={styles.dialogActions}>
        <button ref={cancelRef} type="button" className={styles.secondaryButton} onClick={trading.cancelConfirmation}>Cancelar</button>
        <button type="button" disabled={quoteValue === undefined} onClick={() => trading.confirmOrder(quoteValue)}>
          Confirmar {trading.confirmation.type === "BUY" ? "compra" : "venta"}
        </button>
      </div>
    </>}
  </dialog>;
}
