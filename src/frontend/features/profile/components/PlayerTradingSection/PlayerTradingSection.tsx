"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { usePlayerQuotes } from "../../hooks/usePlayerQuotes";
import type { usePlayerTrading } from "../../hooks/usePlayerTrading";
import { selectPlayerPosition } from "../../utils/player-trading";
import PlayerConfirmationDialog from "./PlayerConfirmationDialog";
import PlayerOrderFeedback from "./PlayerOrderFeedback";
import PlayerOrderForm from "./PlayerOrderForm";
import PlayerPositionSummary from "./PlayerPositionSummary";
import TradingOverview from "./TradingOverview";
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
  const quoteValue = quotes.current?.quoteValue;
  const [operationType, setOperationType] = useState<"BUY" | "SELL">("BUY");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef<HTMLParagraphElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const previousOrderStatus = useRef(trading.order.status);
  const inputId = useId();
  const isSubmitting = trading.order.status === "submitting";

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
      <div><h2>Saldo y tokens de {playerName}</h2></div>
    </div>
    <TradingOverview quotes={quotes} portfolio={portfolio} snapshot={snapshot} retryPortfolio={retryPortfolio} />
    {snapshot && selected && <PlayerPositionSummary playerName={playerName} selected={selected} />}
    {role === "INVESTOR" && <PlayerOrderForm
      playerName={playerName}
      inputId={inputId}
      quoteValue={quoteValue}
      portfolio={portfolio}
      snapshot={snapshot}
      selected={selected}
      trading={trading}
      operationType={operationType}
      onOperationTypeChange={setOperationType}
      triggerRef={triggerRef}
    />}
    <PlayerOrderFeedback
      playerId={playerId}
      playerName={playerName}
      portfolio={portfolio}
      order={trading.order}
      retryPortfolio={retryPortfolio}
      submittingRef={submittingRef}
      resultRef={resultRef}
    />
    {role === "INVESTOR" && <PlayerConfirmationDialog
      inputId={inputId}
      quoteValue={quoteValue}
      trading={trading}
      dialogRef={dialogRef}
      cancelRef={cancelRef}
    />}
  </section>;
}
