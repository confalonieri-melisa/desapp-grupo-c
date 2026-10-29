import type { PlayerQuoteDto } from "@/frontend/services/client/player-quotes.service";
import { formatQuoteTimestampDisplay, formatQuoteValueDisplay, formatStrategy, isDemoQuote } from "../../utils/player-quotes";
import QuoteExplanation from "../QuoteExplanation/QuoteExplanation";
import styles from "../PlayerQuotesSection/PlayerQuotesSection.module.scss";

export default function QuoteSummary({ quote, context, variant = "compact" }: {
  quote: PlayerQuoteDto; context: string; variant?: "featured" | "compact" | "result";
}) {
  return <article className={`${styles.quote} ${styles[variant]}`}>
    <div className={styles.quoteMain}>
      {isDemoQuote(quote.score?.components) && <span className={styles.demoBadge}>Dato de prueba</span>}
      <p className={styles.quoteValue}>
        <strong>{formatQuoteValueDisplay(quote.quoteValue)}</strong>
        <span>créditos por token</span>
      </p>
      <p className={styles.quoteTime}>
        <span>Calculada el</span>{" "}
        <time dateTime={quote.calculatedAt}>{formatQuoteTimestampDisplay(quote.calculatedAt)}</time>
      </p>
    </div>
    <div className={styles.quoteFooter}>
      <p className={styles.strategy}><span>Estrategia</span> {formatStrategy(quote.strategyCode)}</p>
      <QuoteExplanation quote={quote} context={context} />
    </div>
  </article>;
}
