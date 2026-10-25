export function formatQuoteValue(value: number): string {
  return `${value} créditos por token`;
}

export function formatQuoteTimestamp(value: string): string {
  return value.replace("T", " ").replace(/Z$/, " UTC");
}

export function isValidQuoteDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  // Match the API's calendar validation, including its rejection of years 0000–0099.
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}
import type { JsonValue } from "@/frontend/services/client/player-quotes.service";


export function formatScore(value: number | null | undefined): string {
  return value == null ? "No disponible" : String(value);
}

export type ComponentNode = { kind: "value"; value: string } | {
  kind: "object" | "array";
  entries: { name: string; node: ComponentNode }[];
};

export function projectComponents(value: JsonValue | undefined): ComponentNode {
  if (value == null) return { kind: "value", value: "No disponible" };
  if (Array.isArray(value)) return { kind: "array", entries: value.map((item, index) => ({ name: `[${index}]`, node: projectComponents(item) })) };
  if (typeof value === "object") return { kind: "object", entries: Object.entries(value).map(([name, item]) => ({ name, node: projectComponents(item) })) };
  return { kind: "value", value: value === "" ? '""' : String(value) };
}
