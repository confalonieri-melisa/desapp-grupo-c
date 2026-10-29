"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PlayerQuoteDto } from "@/frontend/services/client/player-quotes.service";
import styles from "./QuoteTrend.module.scss";

const formatValue = (value: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(value);
const formatChartValue = (value: number) => `${formatValue(value)} créditos por token`;
const formatAxisValue = (value: number) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value);
const dateFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const fullDateFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const MAX_VISIBLE_QUOTES = 15;

export function buildQuoteTrend(items: PlayerQuoteDto[]) {
  return [...items]
    .sort((a, b) => Date.parse(a.calculatedAt) - Date.parse(b.calculatedAt))
    .slice(-MAX_VISIBLE_QUOTES)
    .map((quote) => ({ timestamp: Date.parse(quote.calculatedAt), value: quote.quoteValue }));
}

export default function QuoteTrend({ items, playerName }: { items: PlayerQuoteDto[]; playerName: string }) {
  const data = buildQuoteTrend(items);
  if (data.length === 0) return <p className={styles.state}>Todavía no hay cotizaciones para mostrar la evolución.</p>;
  if (data.length === 1) return <p className={styles.state}>Solo hay una cotización. Aún no se puede comparar una evolución.</p>;

  const first = data[0];
  const last = data[data.length - 1];
  const change = last.value - first.value;
  const direction = change > 0 ? "Subió" : change < 0 ? "Bajó" : "Sin cambios";
  const dateLabel = (timestamp: number) => dateFormatter.format(timestamp);
  const fullDateLabel = (timestamp: number) => fullDateFormatter.format(timestamp);

  return <div className={styles.content}>
    <div className={styles.chartMeta}><p className={styles.chartLabel}>Créditos por token</p>
      {items.length > data.length && <p className={styles.chartCount}>Últimas {data.length} de {items.length} cotizaciones</p>}
    </div>
    <div className={styles.chart} role="img" aria-label={`Evolución de ${playerName}: ${formatChartValue(first.value)} el ${fullDateLabel(first.timestamp)} a ${formatChartValue(last.value)} el ${fullDateLabel(last.timestamp)}. ${direction}.`}>
      <ResponsiveContainer width="100%" height={170}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#eadde6" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="timestamp" type="number" domain={["dataMin", "dataMax"]} ticks={[first.timestamp, last.timestamp]} tickFormatter={dateLabel} tick={{ fill: "#625b73", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#d9c9d4" }} minTickGap={18} />
          <YAxis dataKey="value" domain={["auto", "auto"]} tickFormatter={formatAxisValue} tick={{ fill: "#625b73", fontSize: 11 }} tickLine={false} axisLine={false} width={52} tickCount={4} />
          <Tooltip labelFormatter={(value) => fullDateLabel(Number(value))} formatter={(value) => [formatChartValue(Number(value)), "Valor"]} contentStyle={{ borderRadius: 10, borderColor: "#eadde6", color: "#4d1838" }} />
          <Area type="monotone" dataKey="value" stroke="#d64282" strokeWidth={2.5} fill="#d64282" fillOpacity={0.12} dot={{ r: 3, fill: "#d64282", stroke: "#fff", strokeWidth: 1.5 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>;
}
