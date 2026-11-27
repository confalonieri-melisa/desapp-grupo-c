import type { useP2POffers } from "../../hooks/useP2POffers";
import { formatP2PCredits as formatCredits } from "../../utils/p2p-trading";
export default function P2PFeedback({ p2p }: { p2p: ReturnType<typeof useP2POffers> }) {
  const r = p2p.result;
  return (
    <div role="status">
      {r.cancelled && <p>Cancelación confirmada de oferta {r.cancelled}</p>}
      {r.published && (
        <p>
          Oferta publicada. Abrí «Comprar» para verla como oferta propia. Los tokens no se
          reservaron.
        </p>
      )}
      {r.status === "submitting" && <p>Enviando operación P2P...</p>}
      {r.status === "succeeded" && r.receipt && (
        <>
          <p>Compra P2P confirmada · Comprobante {r.receipt.operation.id}</p>
          <p>
            {r.receipt.operation.quantity} tokens · {formatCredits(r.receipt.operation.unitPrice)}{" "}
            por token · Total ejecutado {formatCredits(r.receipt.operation.total)}
          </p>
          {r.portfolioFailed && <p>Portfolio no actualizado. Reintentá su consulta.</p>}
        </>
      )}
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
