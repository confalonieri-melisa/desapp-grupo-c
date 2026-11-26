import { useId } from "react";
import type { useP2POffers } from "../../hooks/useP2POffers";
import { validatePublish } from "../../utils/p2p-trading";
import { formatCredits } from "../../utils/player-trading";
export default function P2PPublishForm({
  p2p,
  holding,
}: {
  p2p: ReturnType<typeof useP2POffers>;
  holding: number | null;
}) {
  const id = useId();
  const d = p2p.draft;
  const v = validatePublish(d.quantity, d.price, holding);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        p2p.openPublish(holding);
      }}
    >
      <h3>Publicar oferta P2P</h3>
      <p>Tenencia disponible: {holding ?? "No confirmada"}</p>
      <label htmlFor={id + "q"}>Cantidad completa</label>
      <input
        id={id + "q"}
        inputMode="numeric"
        value={d.quantity}
        onChange={(e) => p2p.setDraft(e.target.value, d.price)}
        aria-describedby={id + "qe"}
        aria-invalid={!!d.quantity && !!v.quantityError}
      />
      <p id={id + "qe"}>{d.quantity && v.quantityError}</p>
      <label htmlFor={id + "p"}>Precio fijo por token</label>
      <input
        id={id + "p"}
        inputMode="decimal"
        value={d.price}
        onChange={(e) => p2p.setDraft(d.quantity, e.target.value)}
        aria-describedby={id + "pe"}
        aria-invalid={!!d.price && !!v.priceError}
      />
      <p id={id + "pe"}>{d.price && v.priceError}</p>
      {!v.error && <p>Total {formatCredits(v.total)}</p>}
      <p>Los tokens no se reservan ni se transfieren al publicar.</p>
      <button disabled={!!v.error || p2p.result.status === "submitting"}>
        Revisar publicaci?n
      </button>
    </form>
  );
}
