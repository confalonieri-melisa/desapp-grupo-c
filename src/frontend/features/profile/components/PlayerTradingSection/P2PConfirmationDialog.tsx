import { useEffect, useId, useRef } from "react";
import { Info } from "lucide-react";
import type { useP2POffers } from "../../hooks/useP2POffers";
import { offerTotal } from "../../utils/p2p-trading";
import { formatP2PCredits as formatCredits } from "../../utils/p2p-trading";
import styles from "./PlayerTradingSection.module.scss";
export default function P2PConfirmationDialog({
  p2p,
  playerName,
}: {
  p2p: ReturnType<typeof useP2POffers>;
  playerName: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const id = useId();
  const c = p2p.confirmation;
  useEffect(() => {
    if (!c) return;
    const trigger = document.activeElement as HTMLElement;
    const dialog = ref.current;
    dialog?.showModal();
    cancel.current?.focus();
    return () => {
      dialog?.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, [c]);
  return (
    <dialog
      ref={ref}
      className={styles.confirmDialog}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        p2p.cancelConfirmation();
      }}
    >
      {c && (
        <>
          <h3 id={id}>
            Confirmar{" "}
            {c.type === "accept" ? "compra" : c.type === "cancel" ? "cancelación" : "publicación"}{" "}
            P2P
          </h3>
          <p>
            {playerName} {c.type !== "publish" && `· Oferta ${c.offer.id}`}
          </p>
          <dl className={styles.confirmMetrics}>
            <div>
              <dt>Cantidad de tokens</dt>
              <dd>{(c.type !== "publish" ? c.offer : c).quantity} tokens</dd>
            </div>
            <div>
              <dt>Precio fijo por token</dt>
              <dd>{formatCredits((c.type !== "publish" ? c.offer : c).unitPrice)}</dd>
            </div>
            <div className={styles.totalBox}>
              <dt>Importe total</dt>
              <dd>{formatCredits(offerTotal(c.type !== "publish" ? c.offer : c))}</dd>
            </div>
          </dl>
          {c.type === "publish" && (
            <p className={styles.infoBox}>
              <Info size={18} aria-hidden="true" />
              <span>Los tokens no se reservan ni se transfieren al publicar.</span>
            </p>
          )}
          <div className={styles.dialogActions}>
            <button
              ref={cancel}
              className={styles.secondaryButton}
              onClick={p2p.cancelConfirmation}
            >
              Volver
            </button>
            <button onClick={() => void p2p.confirm()}>
              Confirmar{" "}
              {c.type === "accept" ? "compra" : c.type === "cancel" ? "cancelación" : "publicación"}{" "}
              P2P
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
