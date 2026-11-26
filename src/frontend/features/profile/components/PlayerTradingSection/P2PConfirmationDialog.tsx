import { useEffect, useId, useRef } from "react";
import type { useP2POffers } from "../../hooks/useP2POffers";
import { offerTotal } from "../../utils/p2p-trading";
import { formatCredits } from "../../utils/player-trading";
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
          <h3 id={id}>Confirmar compra P2P</h3>
          <p>
            {playerName} ? Oferta {c.offer.id}
          </p>
          <p>
            {c.offer.quantity} tokens completos ? Precio fijo {formatCredits(c.offer.unitPrice)} ?
            Total {formatCredits(offerTotal(c.offer))}
          </p>
          <button ref={cancel} onClick={p2p.cancelConfirmation}>
            Volver
          </button>
          <button onClick={() => void p2p.confirm()}>Confirmar compra P2P</button>
        </>
      )}
    </dialog>
  );
}
