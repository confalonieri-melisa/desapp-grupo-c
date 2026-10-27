export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface PlayerQuoteDto {
  playerId: string;
  quoteValue: number;
  unit: "CREDIT_PER_TOKEN";
  calculatedAt: string;
  strategyCode: string;
  strategyVersion: string;
  score?: {
    individualScore?: number | null;
    teamScore?: number | null;
    finalScore?: number | null;
    components?: JsonValue;
  } | null;
}

export interface PlayerQuotesResponse { items: PlayerQuoteDto[] }

export async function getPlayerQuotes(
  token: string,
  playerId: string,
  date?: string,
  signal?: AbortSignal,
): Promise<PlayerQuotesResponse> {
  const query = date === undefined ? "" : `?${new URLSearchParams({ date })}`;
  const response = await fetch(`/api/players/${encodeURIComponent(playerId)}/quotes${query}`, {
    method: "GET", headers: { Authorization: `Bearer ${token}` }, signal,
  });
  let body;
  try { body = await response.json(); } catch { body = undefined; }
  if (!response.ok) {
    const message = typeof body?.error === "string" ? body.error : "No se pudieron cargar las cotizaciones";
    throw Object.assign(new Error(message), { status: response.status });
  }
  return body as PlayerQuotesResponse;
}
