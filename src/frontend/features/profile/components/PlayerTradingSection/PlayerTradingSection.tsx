"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { usePlayerQuotes } from "../../hooks/usePlayerQuotes";
import type { usePlayerTrading } from "../../hooks/usePlayerTrading";
import { formatCredits, formatTradingNumber, selectPlayerPosition, validateBuyQuantity, validateSellQuantity } from "../../utils/player-trading";
import styles from "./PlayerTradingSection.module.scss";

export interface PlayerTradingSectionProps {
  playerId: string;
  playerName: string;
  role: string;
  quotes: ReturnType<typeof usePlayerQuotes>;
  trading: ReturnType<typeof usePlayerTrading>;
}

export default function PlayerTradingSection({ playerId, playerName, role, quotes, trading }: PlayerTradingSectionProps) {
  const { portfolio, retryPortfolio } = trading;
  const snapshot = portfolio.status === "success" || portfolio.status === "empty" ? portfolio.snapshot : null;
  const selected = snapshot ? selectPlayerPosition(snapshot, playerId) : null;
  const position = selected?.position;
  const quoteValue = quotes.current?.quoteValue;
  const [operationType, setOperationType] = useState<"BUY" | "SELL">("BUY");
  const validation = operationType === "BUY"
    ? validateBuyQuantity(trading.draftQuantity, quoteValue ?? null, snapshot?.creditBalance ?? null)
    : validateSellQuantity(trading.draftQuantity, quoteValue ?? null, selected?.quantity ?? null);
  const inputError = trading.draftError ?? (trading.draftQuantity ? validation.error : null);
  const isInvestor = role === "INVESTOR";
  const isSubmitting = trading.order.status === "submitting";
  const inputId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef<HTMLParagraphElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const previousOrderStatus = useRef(trading.order.status);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (trading.confirmation) {
      if (!dialog.open) dialog.showModal();
      cancelRef.current?.focus();
    } else if (dialog.open) {
      dialog.close();
      if (isSubmitting) submittingRef.current?.focus();
      else triggerRef.current?.focus();
    }
  }, [trading.confirmation, isSubmitting]);

  useEffect(() => {
    const status = trading.order.status;
    if (status !== previousOrderStatus.current &&
      (status === "succeeded" || status === "rejected" || status === "uncertain")) {
      resultRef.current?.focus();
    }
    previousOrderStatus.current = status;
  }, [trading.order.status]);

  return <section className={styles.section} aria-label={`Saldo y posición en ${playerName}`}>
    <div className={styles.heading}>
      <div>
        <p className={styles.eyebrow}>Mi posición</p>
        <h2>Saldo y tokens de {playerName}</h2>
      </div>
      <p>Datos del portfolio de tu sesión</p>
    </div>

    <div className={styles.grid}>
      <div className={styles.panel}>
        <h3>Cotización para operar</h3>
        {quotes.history.status === "loading" && <p role="status" className={styles.state}>Cargando cotización…</p>}
        {quotes.history.status === "empty" && <p role="status" className={styles.state}>No hay cotización disponible</p>}
        {quotes.history.status === "error" && <p role="alert" className={styles.state}>No se pudo cargar la cotización. Podés reintentarla en Cotizaciones.</p>}
        {quotes.current && <p className={styles.featureValue}>
          <strong>{formatTradingNumber(quotes.current.quoteValue)}</strong> <span>créditos por token</span>
        </p>}
      </div>

      <div className={styles.panel}>
        <h3>Saldo disponible</h3>
        {(portfolio.status === "idle" || portfolio.status === "loading") && <p role="status" className={styles.state}>Cargando portfolio…</p>}
        {portfolio.status === "refreshing" && <p role="status" className={styles.state}>Actualizando portfolio… Las cifras anteriores aún no están confirmadas.</p>}
        {portfolio.status === "error" && <div role="alert" className={styles.state}>
          <p>No se pudo cargar el portfolio{portfolio.error ? `: ${portfolio.error}` : "."}</p>
          <button type="button" onClick={retryPortfolio}>Reintentar portfolio</button>
        </div>}
        {snapshot && <p className={styles.featureValue}><strong>{formatCredits(snapshot.creditBalance)}</strong></p>}
      </div>
    </div>

    {snapshot && selected && <div className={styles.position}>
      <div className={styles.positionHeading}>
        <h3>Tenencia de {playerName}</h3>
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
    </div>}

    {isInvestor && <div className={styles.tradePanel}>
      <div className={styles.positionHeading}>
        <h3>Operar tokens de {playerName}</h3>
        <p>El total previo es orientativo; la operación usa el precio confirmado por el servidor.</p>
      </div>
      <fieldset className={styles.operationChoice} disabled={isSubmitting}>
        <legend>Tipo de operación</legend>
        <label><input type="radio" name={`${inputId}-operation`} checked={operationType === "BUY"}
          onChange={() => { setOperationType("BUY"); trading.setDraftQuantity(trading.draftQuantity); }} /> Comprar</label>
        <label><input type="radio" name={`${inputId}-operation`} checked={operationType === "SELL"}
          onChange={() => { setOperationType("SELL"); trading.setDraftQuantity(trading.draftQuantity); }} /> Vender</label>
      </fieldset>
      {!quoteValue && <p className={styles.guidance} role="status">No hay cotización vigente disponible para operar.</p>}
      {!snapshot && portfolio.status !== "error" && <p className={styles.guidance} role="status">Esperá el portfolio vigente para operar.</p>}
      {operationType === "SELL" && snapshot && selected?.quantity === 0 && <p className={styles.guidance}>No tenés tokens de este jugador para vender.</p>}
      <div className={styles.orderControls}>
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
        <p id={`${inputId}-help`} className={styles.guidance}>Ingresá un número entero entre 1 y 2.147.483.647.</p>
        {inputError && <p id={`${inputId}-error`} className={styles.fieldError} role="alert">{inputError}</p>}
        {!inputError && validation.estimatedTotal !== null && <p className={styles.estimate}>Total orientativo: <strong>{formatCredits(validation.estimatedTotal)}</strong></p>}
        <button
          ref={triggerRef}
          type="button"
          disabled={!quoteValue || !snapshot || isSubmitting || (operationType === "SELL" && !selected?.quantity)}
          onClick={() => {
            if (quoteValue === undefined) return;
            if (operationType === "BUY") trading.openBuyConfirmation(playerName, quoteValue);
            else trading.openSellConfirmation(playerName, quoteValue);
          }}
        >Revisar {operationType === "BUY" ? "compra" : "venta"}</button>
      </div>
    </div>}

    {trading.order.status === "submitting" && <p ref={submittingRef} tabIndex={-1} className={styles.orderStatus} role="status">Enviando orden de {trading.order.playerName ?? playerName}…</p>}
    {trading.order.status === "succeeded" && trading.order.receipt && <div ref={resultRef} tabIndex={-1} className={styles.orderStatus} role="status">
      <h3>{trading.order.receipt.operation.type === "BUY" ? "Compra" : "Venta"} confirmada de {trading.order.playerName ?? playerName}</h3>
      <p>{formatTradingNumber(trading.order.receipt.operation.quantity)} tokens a {formatCredits(trading.order.receipt.operation.quoteValue)} por token.</p>
      <p>Total ejecutado: <strong>{formatCredits(trading.order.receipt.operation.total)}</strong></p>
      {trading.order.playerId === playerId && portfolio.status === "refreshing" && <p>Actualizando saldo y tenencia…</p>}
      {trading.order.playerId === playerId && portfolio.status === "error" && <p>La operación se confirmó, pero el portfolio aún no pudo actualizarse.</p>}
    </div>}
    {(trading.order.status === "rejected" || trading.order.status === "uncertain") && <div ref={resultRef} tabIndex={-1} className={styles.orderStatus} role="alert">
      <h3>Resultado de la orden para {trading.order.playerName ?? playerName}</h3>
      <p>{trading.order.error}</p>
      {trading.order.status === "uncertain" && <p>La orden podría haberse procesado. Consultá el portfolio antes de intentar otra vez.</p>}
      <button type="button" onClick={retryPortfolio}>Consultar portfolio</button>
    </div>}

    {isInvestor && <dialog
      ref={dialogRef}
      className={styles.confirmDialog}
      aria-labelledby={`${inputId}-dialog-title`}
      aria-describedby={`${inputId}-dialog-description`}
      onCancel={(event) => { event.preventDefault(); trading.cancelConfirmation(); }}
    >
      {trading.confirmation && <>
        <h3 id={`${inputId}-dialog-title`}>Confirmar {trading.confirmation.type === "BUY" ? "compra" : "venta"}</h3>
        <p id={`${inputId}-dialog-description`}>Revisá los datos antes de enviar la orden para {trading.confirmation.playerName}.</p>
        <dl className={styles.confirmMetrics}>
          <div><dt>Operación</dt><dd>{trading.confirmation.type === "BUY" ? "Compra" : "Venta"}</dd></div>
          <div><dt>Jugador</dt><dd>{trading.confirmation.playerName}</dd></div>
          <div><dt>Cantidad</dt><dd>{formatTradingNumber(trading.confirmation.quantity)} tokens</dd></div>
          <div><dt>Cotización visible</dt><dd>{formatCredits(trading.confirmation.quoteValue)} por token</dd></div>
          <div><dt>Total orientativo</dt><dd>{formatCredits(trading.confirmation.estimatedTotal)}</dd></div>
        </dl>
        {quoteValue === undefined && <p role="alert">La cotización ya no está disponible. Cancelá y consultá la cotización vigente.</p>}
        <div className={styles.dialogActions}>
          <button ref={cancelRef} type="button" className={styles.secondaryButton} onClick={trading.cancelConfirmation}>Cancelar</button>
          <button type="button" disabled={quoteValue === undefined} onClick={() => trading.confirmOrder(quoteValue)}>Confirmar {trading.confirmation.type === "BUY" ? "compra" : "venta"}</button>
        </div>
      </>}
    </dialog>}
  </section>;
}
