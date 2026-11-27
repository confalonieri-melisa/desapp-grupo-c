import { RefreshCw, ShoppingCart, Trash2, Users } from "lucide-react";
import styles from "./PlayerTradingSection.module.scss";
import type { useP2POffers } from "../../hooks/useP2POffers";
import { canAccept, offerTotal, sellerLabel } from "../../utils/p2p-trading";
import { formatP2PCredits as formatCredits } from "../../utils/p2p-trading";
export default function P2POfferList({
  p2p,
  userId,
  balance,
  operable,
  ownOnly = false,
}: {
  p2p: ReturnType<typeof useP2POffers>;
  userId: string;
  balance: number | null;
  operable: boolean;
  ownOnly?: boolean;
}) {
  const offers = ownOnly ? p2p.offers.filter((o) => o.sellerId === userId) : p2p.offers;
  return (
    <section
      className={styles.offerPanel}
      aria-label={ownOnly ? "Mis ofertas" : "Ofertas disponibles"}
    >
      <div className={styles.offerHeading}>
        <div>
          <h3 className={styles.iconHeading}>
            <Users size={20} aria-hidden="true" />
            {ownOnly ? "Mis ofertas" : "Ofertas disponibles"}
          </h3>
          <p>
            {ownOnly
              ? "Administrá tus ofertas de este jugador."
              : "Comprá tokens publicados por otros usuarios."}
          </p>
        </div>
        <button type="button" className={styles.outlineButton} onClick={() => void p2p.refresh()}>
          <RefreshCw size={16} aria-hidden="true" /> Actualizar ofertas
        </button>
      </div>
      {p2p.status === "loading" && <p role="status">Cargando ofertas...</p>}
      {(p2p.status === "error" || p2p.status === "refreshing") && (
        <p role="status">Lista no actualizada. {p2p.error}</p>
      )}
      {p2p.status !== "loading" && offers.length === 0 && (
        <p className={styles.emptyOffers}>
          {ownOnly ? "No tenés ofertas abiertas para este jugador." : "No hay ofertas abiertas."}
        </p>
      )}
      {offers.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.offerTable}>
            <thead>
              <tr>
                <th>Vendedor</th>
                <th>Cantidad</th>
                <th>Precio por token</th>
                <th>Total</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id}>
                  <td data-label="Vendedor">
                    {o.sellerId === userId ? (
                      <span className={styles.ownBadge}>Tu oferta</span>
                    ) : (
                      sellerLabel(o)
                    )}
                    {p2p.result.published?.id === o.id &&
                      p2p.status !== "ready" &&
                      " · Confirmada localmente"}
                  </td>
                  <td data-label="Cantidad">{o.quantity} tokens</td>
                  <td data-label="Precio por token">{formatCredits(o.unitPrice)}</td>
                  <td data-label="Total">
                    <strong>{formatCredits(offerTotal(o))}</strong>
                  </td>
                  <td data-label="Acción">
                    {operable &&
                      (o.sellerId === userId ? (
                        <button
                          className={`${styles.outlineButton} ${styles.deleteButton}`}
                          type="button"
                          aria-label="Cancelar oferta propia"
                          title="Cancelar oferta propia"
                          disabled={p2p.status !== "ready" || p2p.result.status === "submitting"}
                          onClick={() => p2p.openCancel(o, userId)}
                        >
                          <Trash2 size={18} aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          className={styles.outlineButton}
                          disabled={
                            p2p.result.status === "submitting" ||
                            !canAccept(o, userId, balance, p2p.status === "ready")
                          }
                          onClick={() => p2p.openAccept(o, userId, balance, balance !== null)}
                        >
                          <ShoppingCart size={16} aria-hidden="true" /> Comprar oferta completa
                        </button>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
