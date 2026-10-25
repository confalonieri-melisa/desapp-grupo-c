import type { PlayerQuoteDto } from "@/frontend/services/client/player-quotes.service";
import { formatScore, projectComponents, type ComponentNode } from "../../utils/player-quotes";

function Components({ node }: { node: ComponentNode }) {
  if (node.kind === "value") return <span>{node.value}</span>;
  if (node.entries.length === 0) return <span>No hay componentes ({node.kind === "array" ? "array vacío" : "objeto vacío"})</span>;
  return <dl>{node.entries.map(({ name, node: child }) => <div key={name}>
    <dt>{name}</dt><dd><Components node={child} /></dd>
  </div>)}</dl>;
}

export default function QuoteExplanation({ quote, context }: { quote: PlayerQuoteDto; context: string }) {
  return <details>
    <summary>Ver explicación: {context}</summary>
    <dl>
      <div><dt>Score individual</dt><dd>{formatScore(quote.score?.individualScore)}</dd></div>
      <div><dt>Score colectivo</dt><dd>{formatScore(quote.score?.teamScore)}</dd></div>
      <div><dt>Score final</dt><dd>{formatScore(quote.score?.finalScore)}</dd></div>
    </dl>
    <h4>Componentes persistidos</h4>
    <Components node={projectComponents(quote.score?.components)} />
  </details>;
}
