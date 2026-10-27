import type { JsonValue } from "@/frontend/services/client/player-quotes.service";

export function isDemoQuote(components: JsonValue | undefined): boolean {
  return !!components && !Array.isArray(components) && typeof components === "object"
    && typeof components.demoFixture === "string";
}

export function formatQuoteValue(value: number): string {
  return `${value} créditos por token`;
}

export function formatQuoteTimestamp(value: string): string {
  return value.replace("T", " ").replace(/Z$/, " UTC");
}

export function formatQuoteValueDisplay(value: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 20 }).format(value);
}

export function formatQuoteTimestampDisplay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatQuoteTimestamp(value);
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
}

export function formatQuoteDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!isValidQuoteDate(value)) return value;
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatStrategy(code: string): string {
  if (code === "INDIVIDUAL_PERFORMANCE") return "Rendimiento individual";
  if (code === "INDIVIDUAL_PLUS_TEAM_CONTEXT") return "Rendimiento y contexto del equipo";
  return code.replaceAll("_", " ");
}

export function isValidQuoteDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  // Match the API's calendar validation, including its rejection of years 0000–0099.
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}
export function formatScore(value: number | null | undefined): string {
  return value == null ? "No disponible" : String(value);
}
