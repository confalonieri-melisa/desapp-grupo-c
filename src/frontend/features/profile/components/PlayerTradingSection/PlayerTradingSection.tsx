"use client";

import { ShoppingCart, Tag } from "lucide-react";
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

import type { useP2POffers } from "../../hooks/useP2POffers";
import P2POfferList from "./P2POfferList";
import P2PConfirmationDialog from "./P2PConfirmationDialog";
import P2PPublishForm from "./P2PPublishForm";
import P2PFeedback from "./P2PFeedback";

export interface PlayerTradingSectionProps {
  pool?: { status: string; availableQuantity: number | null; refresh: () => Promise<void> };
  p2p?: ReturnType<typeof useP2POffers>;
  userId?: string;
  playerId: string;
  playerName: string;
  role: string;
  quotes: ReturnType<typeof usePlayerQuotes>;
  trading: ReturnType<typeof usePlayerTrading>;
}

export default function PlayerTradingSection({
  pool,
  p2p,
  userId = "",
  playerId,
  playerName,
  role,
  quotes,
  trading,
}: PlayerTradingSectionProps) {
  const { portfolio, retryPortfolio } = trading;
  const snapshot =
    portfolio.status === "success" || portfolio.status === "empty" ? portfolio.snapshot : null;
  const selected = snapshot ? selectPlayerPosition(snapshot, playerId) : null;
  const quoteValue = quotes.current?.quoteValue;
  const [view, setView] = useState("buy");
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
    if (
      status !== previousOrderStatus.current &&
      (status === "rejected" || status === "uncertain")
    ) {
      resultRef.current?.focus();
    }
    previousOrderStatus.current = status;
  }, [trading.order.status]);

  return (
    <section className={styles.section} aria-label={`Saldo y posición en ${playerName}`}>
      <div className={styles.heading}>
        <div>
          <h2>Saldo y tokens de {playerName}</h2>
        </div>
      </div>
      <TradingOverview
        quotes={quotes}
        portfolio={portfolio}
        snapshot={snapshot}
        retryPortfolio={retryPortfolio}
      />
      {snapshot && selected && (
        <PlayerPositionSummary playerName={playerName} selected={selected} />
      )}
      {role === "INVESTOR" && (
        <nav className={styles.segmented} aria-label="Operación">
          <button aria-pressed={view === "buy"} onClick={() => setView("buy")}>
            <ShoppingCart size={18} aria-hidden="true" /> Comprar
          </button>
          <button aria-pressed={view === "sell"} onClick={() => setView("sell")}>
            <Tag size={18} aria-hidden="true" /> Vender
          </button>
        </nav>
      )}
      <div className={styles.tradingLayout}>
        <div>
          {role === "INVESTOR" && view === "buy" && pool && pool.status !== "success" && (
            <p role="status">
              Disponibilidad del pool no confirmada.{" "}
              <button onClick={() => void pool.refresh()}>Reintentar disponibilidad</button>
            </p>
          )}
          {role === "INVESTOR" &&
            view === "buy" &&
            pool?.status === "success" &&
            (pool.availableQuantity ?? 0) > 0 && (
              <PlayerOrderForm
                availableQuantity={pool?.availableQuantity}
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
              />
            )}
          {p2p && view === "sell" && role === "INVESTOR" && !p2p.forbidden && (
            <P2PPublishForm p2p={p2p} holding={selected?.quantity ?? null} />
          )}
        </div>
        {p2p && (
          <>
            {view === "buy" && (
              <P2POfferList
                p2p={p2p}
                userId={userId}
                balance={snapshot?.creditBalance ?? null}
                operable={role === "INVESTOR" && !p2p.forbidden}
              />
            )}
            {view === "sell" && role === "INVESTOR" && (
              <P2POfferList
                p2p={p2p}
                userId={userId}
                balance={snapshot?.creditBalance ?? null}
                operable={!p2p.forbidden}
                ownOnly
              />
            )}
          </>
        )}
      </div>
      {p2p && (
        <>
          <P2PFeedback p2p={p2p} />
          {role === "INVESTOR" && <P2PConfirmationDialog p2p={p2p} playerName={playerName} />}
        </>
      )}
      <PlayerOrderFeedback
        playerId={playerId}
        playerName={playerName}
        portfolio={portfolio}
        order={trading.order}
        retryPortfolio={retryPortfolio}
        submittingRef={submittingRef}
        resultRef={resultRef}
      />
      {role === "INVESTOR" && (
        <PlayerConfirmationDialog
          inputId={inputId}
          quoteValue={quoteValue}
          trading={trading}
          dialogRef={dialogRef}
          cancelRef={cancelRef}
        />
      )}
    </section>
  );
}
