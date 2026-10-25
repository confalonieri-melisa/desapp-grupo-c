import type { PlayerQuoteDto } from "@/frontend/services/client/player-quotes.service";
import QuoteSummary from "../QuoteSummary/QuoteSummary";
import styles from "../PlayerQuotesSection/PlayerQuotesSection.module.scss";

export default function QuoteHistory({ items, generation }: { items: PlayerQuoteDto[]; generation: number }) {
  return <section className={styles.history} aria-labelledby="quote-history-title">
    <div className={styles.subsectionHeading}>
      <div>
        <p className={styles.eyebrow}>Evolución</p>
        <h3 id="quote-history-title">Historial completo</h3>
      </div>
      {items.length > 0 && <span className={styles.count}>{items.length} {items.length === 1 ? "registro" : "registros"}</span>}
    </div>
    {items.length === 0 ? <p className={styles.empty}>No existen cotizaciones históricas</p> : <ol className={styles.historyList}>
      {items.map((quote, index) => <li key={`${generation}:${index}`} className={styles.historyItem}>
        <div className={styles.historyMarker} aria-hidden="true" />
        <div className={styles.historyContent}>
          <div className={styles.historyLabel}>
            <h4>{index === 0 ? "Cotización actual" : `Registro ${index + 1}`}</h4>
            {index === 0 && <span className={styles.currentBadge}>Más reciente</span>}
          </div>
          <QuoteSummary quote={quote} context={`registro histórico ${index + 1}`} />
        </div>
      </li>)}
    </ol>}
  </section>;
}
