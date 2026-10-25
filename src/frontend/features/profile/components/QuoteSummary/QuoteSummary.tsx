import type { PlayerQuoteDto } from "@/frontend/services/client/player-quotes.service";
import { formatQuoteTimestamp, formatQuoteValue } from "../../utils/player-quotes";
import QuoteExplanation from "../QuoteExplanation/QuoteExplanation";

export default function QuoteSummary({ quote, context }: { quote: PlayerQuoteDto; context: string }) {
  return <><dl>
    <div><dt>Valor</dt><dd>{formatQuoteValue(quote.quoteValue)}</dd></div>
    <div><dt>Fecha y hora de cálculo</dt><dd><time dateTime={quote.calculatedAt}>{formatQuoteTimestamp(quote.calculatedAt)}</time></dd></div>
    <div><dt>Estrategia</dt><dd>{quote.strategyCode}</dd></div>
    <div><dt>Versión</dt><dd>{quote.strategyVersion}</dd></div>
  </dl><QuoteExplanation quote={quote} context={context} /></>;
}
