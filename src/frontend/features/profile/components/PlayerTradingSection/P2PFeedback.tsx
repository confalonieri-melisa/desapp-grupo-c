import type { useP2POffers } from "../../hooks/useP2POffers";
import { formatCredits } from "../../utils/player-trading";
export default function P2PFeedback({ p2p }: { p2p: ReturnType<typeof useP2POffers> }) {
  const r = p2p.result;
  return (
    <div role="status">
      {r.published && (
        <p>
          Oferta publicada. Abr? ?Comprar? para verla como oferta propia. Los tokens no se
          reservaron.
        </p>
      )}
      {r.status === "submitting" && <p>Enviando operaci?n P2P?</p>}
      {r.status === "succeeded" && r.receipt && (
        <>
          <p>Compra P2P confirmada ? Comprobante {r.receipt.operation.id}</p>
          <p>
            {r.receipt.operation.quantity} tokens ? {formatCredits(r.receipt.operation.unitPrice)}{" "}
            por token ? Total ejecutado {formatCredits(r.receipt.operation.total)}
          </p>
          {r.portfolioFailed && <p>Portfolio no actualizado. Reintent? su consulta.</p>}
        </>
      )}
      {r.status === "rejected" && <p role="alert">Operaci?n rechazada: {r.error}</p>}
      {r.status === "uncertain" && (
        <>
          <p role="alert">
            Resultado incierto: {r.error}. Actualiz? los datos antes de decidir otro intento.
          </p>
          <button onClick={p2p.retryAccept}>Revisar reintento de la misma aceptaci?n</button>
        </>
      )}
    </div>
  );
}
