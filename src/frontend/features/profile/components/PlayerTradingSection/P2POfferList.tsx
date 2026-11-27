import type { useP2POffers } from "../../hooks/useP2POffers";
import { canAccept, offerTotal, sellerLabel } from "../../utils/p2p-trading";
import { formatP2PCredits as formatCredits } from "../../utils/p2p-trading";
export default function P2POfferList({
  p2p,
  userId,
  balance,
  operable,
}: {
  p2p: ReturnType<typeof useP2POffers>;
  userId: string;
  balance: number | null;
  operable: boolean;
}) {
  return (
    <section aria-label="Ofertas P2P">
      <h3>Ofertas P2P a precio fijo</h3>
      <button onClick={() => void p2p.refresh()}>Actualizar ofertas</button>
      {p2p.status === "loading" && <p role="status">Cargando ofertas...</p>}
      {p2p.status === "empty" && <p>No hay ofertas abiertas.</p>}
      {(p2p.status === "error" || p2p.status === "refreshing") && (
        <p role="status">Lista no actualizada. {p2p.error}</p>
      )}
      <ul>
        {p2p.offers.map((o) => (
          <li key={o.id}>
            <p title={o.sellerId}>
              {sellerLabel(o)} {o.sellerId === userId && "(Oferta propia)"}
              {p2p.result.published?.id === o.id &&
                p2p.status !== "ready" &&
                " (Confirmada localmente)"}
            </p>
            <p>Oferta {o.id}</p>
            <p>
              {o.quantity} tokens · {formatCredits(o.unitPrice)} por token · Total{" "}
              {formatCredits(offerTotal(o))}
            </p>
            {operable && o.sellerId === userId && (
              <button
                disabled={p2p.status !== "ready" || p2p.result.status === "submitting"}
                onClick={() => p2p.openCancel(o, userId)}
              >
                Cancelar oferta propia
              </button>
            )}
            {operable && o.sellerId !== userId && (
              <button
                disabled={
                  p2p.result.status === "submitting" ||
                  !canAccept(o, userId, balance, p2p.status === "ready")
                }
                onClick={() => p2p.openAccept(o, userId, balance, balance !== null)}
              >
                Comprar oferta completa
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
