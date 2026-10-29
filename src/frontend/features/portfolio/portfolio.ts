import type { PortfolioItem, PortfolioSnapshot } from "@/frontend/services/client/player-trading.service";

export type MetricAggregate = {
  value: number | null;
  excludedCount: number;
  status: "complete" | "partial" | "unavailable";
};

function aggregate(items: PortfolioItem[], field: "currentValue" | "unrealizedPnl"): MetricAggregate {
  const known = items.map((item) => item[field]).filter((value): value is number => value !== null);
  const excludedCount = items.length - known.length;
  return {
    value: items.length > 0 && known.length === 0 ? null : known.reduce((sum, value) => sum + value, 0),
    excludedCount,
    status: known.length === 0 && items.length > 0 ? "unavailable" : excludedCount > 0 ? "partial" : "complete",
  };
}

export function derivePortfolioSummary(snapshot: PortfolioSnapshot) {
  const holdingsValue = aggregate(snapshot.items, "currentValue");
  const unrealizedTotal = aggregate(snapshot.items, "unrealizedPnl");
  const estimatedWorth: MetricAggregate = {
    ...holdingsValue,
    value: holdingsValue.value === null ? null : snapshot.creditBalance + holdingsValue.value,
  };
  return { holdingsValue, unrealizedTotal, estimatedWorth };
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 20 }).format(value);
}

export function formatCredits(value: number | null): string {
  return value === null ? "No disponible" : `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value)} créditos`;
}
