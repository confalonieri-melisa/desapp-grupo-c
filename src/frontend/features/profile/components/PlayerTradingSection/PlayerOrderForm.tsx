import { ShoppingCart, Zap } from "lucide-react";
import type { usePlayerTrading } from "../../hooks/usePlayerTrading";
import type { PlayerPositionSelection } from "../../utils/player-trading";
import {
  formatCredits,
  formatTradingNumber,
  validateBuyQuantity,
  validateSellQuantity,
} from "../../utils/player-trading";
import styles from "./PlayerTradingSection.module.scss";

interface PlayerOrderFormProps {
  availableQuantity?: number | null;
  playerName: string;
  inputId: string;
  quoteValue?: number;
  portfolio: ReturnType<typeof usePlayerTrading>["portfolio"];
  snapshot: ReturnType<typeof usePlayerTrading>["portfolio"]["snapshot"];
  selected: PlayerPositionSelection | null;
  trading: ReturnType<typeof usePlayerTrading>;
  operationType: "BUY" | "SELL";
  onOperationTypeChange: (type: "BUY" | "SELL") => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export default function PlayerOrderForm({
  availableQuantity,
  playerName,
  inputId,
  quoteValue,
  portfolio,
  snapshot,
  selected,
  trading,
  operationType,
  triggerRef,
}: PlayerOrderFormProps) {
  const isSubmitting = trading.order.status === "submitting";
  const validation =
    operationType === "BUY"
      ? validateBuyQuantity(
          trading.draftQuantity,
          quoteValue ?? null,
          snapshot?.creditBalance ?? null,
          availableQuantity,
        )
      : validateSellQuantity(trading.draftQuantity, quoteValue ?? null, selected?.quantity ?? null);
  const inputError = trading.draftError ?? (trading.draftQuantity ? validation.error : null);
  const canSubmit = Boolean(
    !validation.error &&
    quoteValue &&
    snapshot &&
    !isSubmitting &&
    (operationType === "BUY" || selected?.quantity),
  );

  return (
    <div className={styles.tradePanel}>
      <h3 className={styles.iconHeading}>
        <Zap size={20} aria-hidden="true" /> Comprar al pool
      </h3>
      <p className={styles.availability}>Disponibles: {availableQuantity} tokens</p>
      {!quoteValue && (
        <p className={styles.guidance} role="status">
          No hay cotización vigente disponible para operar.
        </p>
      )}
      {!snapshot && portfolio.status !== "error" && (
        <p className={styles.guidance} role="status">
          Esperá el portfolio vigente para operar.
        </p>
      )}
      {operationType === "SELL" && snapshot && selected?.quantity === 0 && (
        <p className={styles.guidance}>No tenés tokens de este jugador para vender.</p>
      )}
      <div className={styles.orderControls}>
        <p className={styles.operationSummary}>
          {operationType === "BUY" ? (
            <>
              Saldo disponible:{" "}
              <strong>{snapshot ? formatCredits(snapshot.creditBalance) : "No disponible"}</strong>.
            </>
          ) : (
            <>
              Tenés disponibles{" "}
              <strong>
                {selected ? `${formatTradingNumber(selected.quantity)} tokens` : "No disponible"}
              </strong>{" "}
              de este jugador.
            </>
          )}
        </p>
        <label htmlFor={inputId}>Cantidad de tokens</label>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={trading.draftQuantity}
          onChange={(event) => trading.setDraftQuantity(event.target.value)}
          aria-invalid={Boolean(inputError)}
          aria-describedby={`${inputId}-help${inputError ? ` ${inputId}-error` : ""}`}
          disabled={isSubmitting}
        />
        <p id={`${inputId}-help`} className={styles.fieldHelp}>
          Ingresá cuántos tokens querés {operationType === "BUY" ? "comprar." : "vender."}
        </p>
        {inputError && (
          <p id={`${inputId}-error`} className={styles.fieldError} role="alert">
            {inputError}
          </p>
        )}
        {!inputError && validation.estimatedTotal !== null && (
          <p className={styles.estimate}>
            Total estimado: <strong>{formatCredits(validation.estimatedTotal)}</strong>
          </p>
        )}
        <button
          ref={triggerRef}
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            if (quoteValue === undefined) return;
            if (operationType === "BUY") trading.openBuyConfirmation(playerName, quoteValue);
            else trading.openSellConfirmation(playerName, quoteValue);
          }}
        >
          <ShoppingCart size={17} aria-hidden="true" /> Ver detalle de la{" "}
          {operationType === "BUY" ? "compra" : "venta"}
        </button>
      </div>
    </div>
  );
}
