import { useEffect } from "react";
import { toast } from "react-toastify";
import styles from "./PlayerTradingSection.module.scss";
import type { useP2POffers } from "../../hooks/useP2POffers";
import { formatP2PCredits as formatCredits } from "../../utils/p2p-trading";
export default function P2PFeedback({ p2p }: { p2p: ReturnType<typeof useP2POffers> }) {
  const r = p2p.result;
  const receipt = r.receipt;
  const publication = r.published;
  const cancelled = r.cancelled;
  useEffect(() => {
    if (!receipt) return;
    const op = receipt.operation;
    toast.success(
      `Compra confirmada: ${op.quantity} tokens · Total ${formatCredits(op.total)}`,
      {
        toastId: `p2p-buy-${op.id}`,
      },
    );
  }, [receipt]);
  useEffect(() => {
    if (publication)
      toast.success("Oferta publicada. Los tokens no se reservaron ni se transfirieron.", {
        toastId: `p2p-publish-${publication.id}`,
      });
  }, [publication]);
  useEffect(() => {
    if (cancelled)
      toast.success("Cancelación confirmada de la oferta", { toastId: `p2p-cancel-${cancelled}` });
  }, [cancelled]);
  return (
    <div role="status" className={styles.feedback}>
      {r.status === "submitting" && <p>Enviando operación...</p>}
      {r.portfolioFailed && <p role="alert">Portfolio no actualizado. Reintentá su consulta.</p>}
      {r.status === "rejected" && <p role="alert">Operación rechazada: {r.error}</p>}
      {r.status === "uncertain" && (
        <>
          <p role="alert">
            Resultado incierto: {r.error}. Actualizá los datos antes de decidir otro intento.
          </p>
          {r.kind === "accept" && (
            <button onClick={p2p.retryAccept}>Revisar reintento de la misma aceptación</button>
          )}
        </>
      )}
    </div>
  );
}
