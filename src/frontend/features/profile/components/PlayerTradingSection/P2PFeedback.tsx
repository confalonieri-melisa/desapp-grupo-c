import { useEffect } from "react";
import { toast } from "react-toastify";
import styles from "./PlayerTradingSection.module.scss";
import type { useP2POffers } from "../../hooks/useP2POffers";
export default function P2PFeedback({ p2p }: { p2p: ReturnType<typeof useP2POffers> }) {
  const r = p2p.result;
  const receipt = r.receipt;
  const publication = r.published;
  const cancelled = r.cancelled;
  useEffect(() => {
    if (!receipt) return;
    const op = receipt.operation;
    toast.success("Compra confirmada", { toastId: `p2p-buy-${op.id}` });
  }, [receipt]);
  useEffect(() => {
    if (publication)
      toast.success("Oferta publicada", {
        toastId: `p2p-publish-${publication.id}`,
      });
  }, [publication]);
  useEffect(() => {
    if (cancelled)
      toast.success("Oferta cancelada", { toastId: `p2p-cancel-${cancelled}` });
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
