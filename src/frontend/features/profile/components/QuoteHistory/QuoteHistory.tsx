import type { PlayerQuoteDto } from "@/frontend/services/client/player-quotes.service";
import QuoteSummary from "../QuoteSummary/QuoteSummary";

export default function QuoteHistory({ items, generation }: { items: PlayerQuoteDto[]; generation: number }) {
  return <div>
    <h3>Historial completo</h3>
    {items.length === 0 ? <p>No existen cotizaciones históricas</p> : <ol>
      {items.map((quote, index) => <li key={`${generation}:${index}`}>
        <h4>Registro {index + 1}</h4>
        <QuoteSummary quote={quote} context={`registro histórico ${index + 1}`} />
      </li>)}
    </ol>}
  </div>;
}
