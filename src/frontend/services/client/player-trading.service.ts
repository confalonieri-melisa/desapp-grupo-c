export interface PortfolioItem {
  playerId: string;
  quantity: number;
  averagePurchasePrice: number;
  currentQuoteValue: number | null;
  currentValue: number | null;
  unrealizedPnl: number | null;
}

export interface PortfolioSnapshot {
  creditBalance: number;
  items: PortfolioItem[];
}

export interface MarketOrderRequest {
  playerId: string;
  quantity: number;
}

export interface MarketOperationResult {
  operation: {
    id: string;
    type: "BUY" | "SELL";
    userId: string;
    playerId: string;
    quantity: number;
    quoteValue: number;
    total: number;
    createdAt: string;
  };
  account: { creditBalance: number };
  holding: { quantity: number; averagePurchasePrice: number };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isMarketOperationResult(value: unknown, type: "BUY" | "SELL"): value is MarketOperationResult {
  if (!isRecord(value) || !isRecord(value.operation) || !isRecord(value.account) || !isRecord(value.holding)) return false;
  const { operation, account, holding } = value;
  return operation.type === type
    && typeof operation.id === "string" && typeof operation.userId === "string"
    && typeof operation.playerId === "string" && typeof operation.createdAt === "string"
    && typeof operation.quantity === "number" && typeof operation.quoteValue === "number"
    && typeof operation.total === "number" && typeof account.creditBalance === "number"
    && typeof holding.quantity === "number" && typeof holding.averagePurchasePrice === "number";
}

export async function getPortfolio(token: string, signal?: AbortSignal): Promise<PortfolioSnapshot> {
  const response = await fetch("/api/portfolio", {
    method: "GET", headers: { Authorization: `Bearer ${token}` }, signal,
  });
  let body: unknown;
  try { body = await response.json(); } catch { body = undefined; }

  if (!response.ok || body === undefined) {
    const apiError = body && typeof body === "object" ? body as { error?: unknown } : {};
    const message = typeof apiError.error === "string" ? apiError.error : "No se pudo cargar el portfolio";
    throw Object.assign(new Error(message), { status: response.status });
  }

  return body as PortfolioSnapshot;
}

async function postPlayerTokens(token: string, order: MarketOrderRequest, type: "BUY" | "SELL"): Promise<MarketOperationResult> {
  const response = await fetch(`/api/orders/${type.toLowerCase()}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: order.playerId, quantity: order.quantity }),
  });
  let body: unknown;
  try { body = await response.json(); } catch { body = undefined; }

  if (response.status !== 201 || !isMarketOperationResult(body, type)) {
    const apiError = body && typeof body === "object" ? body as { error?: unknown } : {};
    const message = typeof apiError.error === "string" ? apiError.error : `No se pudo confirmar la ${type === "BUY" ? "compra" : "venta"}`;
    throw Object.assign(new Error(message), { status: response.status });
  }

  return body as MarketOperationResult;
}

export function buyPlayerTokens(token: string, order: MarketOrderRequest): Promise<MarketOperationResult> {
  return postPlayerTokens(token, order, "BUY");
}

export function sellPlayerTokens(token: string, order: MarketOrderRequest): Promise<MarketOperationResult> {
  return postPlayerTokens(token, order, "SELL");
}
