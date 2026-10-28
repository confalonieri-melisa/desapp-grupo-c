import type { PlayerQuoteDto } from "@/frontend/services/client/player-quotes.service";
import styles from "./QuoteTrend.module.scss";

const formatChartValue = (value: number): string => `${new Intl.NumberFormat("es-AR", { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(value)} créditos por token`;

function quoteDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

export default function QuoteTrend({ items, playerName }: { items: PlayerQuoteDto[]; playerName: string }) {
  const ordered = [...items].sort((a, b) => Date.parse(a.calculatedAt) - Date.parse(b.calculatedAt));
  if (ordered.length === 0) return <p className={styles.state}>Todavía no hay cotizaciones para mostrar la evolución.</p>;
  if (ordered.length === 1) return <p className={styles.state}>Solo hay una cotización. Aún no se puede comparar una evolución.</p>;

  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const values = ordered.map((quote) => quote.quoteValue);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = maximum - minimum;
  const firstTime = Date.parse(first.calculatedAt);
  const duration = Date.parse(last.calculatedAt) - firstTime;
  const coordinates = ordered.map((quote, index) => {
    const x = 8 + (duration > 0 ? (Date.parse(quote.calculatedAt) - firstTime) / duration : index / (ordered.length - 1)) * 224;
    const y = spread === 0 ? 36 : 60 - (quote.quoteValue - minimum) / spread * 48;
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  });
  const points = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
  const change = last.quoteValue - first.quoteValue;
  const direction = change > 0 ? "Subió" : change < 0 ? "Bajó" : "Sin cambios";

  return <div className={styles.content}>
    <svg className={change < 0 ? styles.down : styles.up} viewBox="0 0 240 72" preserveAspectRatio="none"
      role="img" aria-label={`Evolución de ${playerName}: ${formatChartValue(first.quoteValue)} el ${quoteDate(first.calculatedAt)} a ${formatChartValue(last.quoteValue)} el ${quoteDate(last.calculatedAt)}. ${direction}.`}>
      <defs><linearGradient id="quote-trend-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
      </linearGradient></defs>
      <polygon points={`${points} 232,72 8,72`} fill="url(#quote-trend-fill)" />
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {coordinates.map(({ x, y }, index) => <circle key={`${ordered[index].calculatedAt}:${index}`} cx={x} cy={y} r="2.8" fill="currentColor" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
    </svg>
    <p className={styles.change}>{direction}{change !== 0 ? ` ${formatChartValue(Math.abs(change))}` : ""}</p>
  </div>;
}
