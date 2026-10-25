import type { PlayerQuoteDto } from "@/frontend/services/client/player-quotes.service";
import { formatScore } from "../../utils/player-quotes";
import styles from "../PlayerQuotesSection/PlayerQuotesSection.module.scss";

export default function QuoteExplanation({ quote, context }: { quote: PlayerQuoteDto; context: string }) {
  return <details className={styles.explanation}>
    <summary aria-label={`Ver detalle del cálculo de ${context}`}>Ver detalle del cálculo</summary>
    <dl className={styles.scores}>
      <div><dt>Score individual</dt><dd>{formatScore(quote.score?.individualScore)}</dd></div>
      <div><dt>Score colectivo</dt><dd>{formatScore(quote.score?.teamScore)}</dd></div>
      <div><dt>Score final</dt><dd>{formatScore(quote.score?.finalScore)}</dd></div>
    </dl>
  </details>;
}
