import type { PortfolioItem, PortfolioSnapshot } from "@/frontend/services/client/player-trading.service";

export interface PlayerPositionSelection {
  isPortfolioEmpty: boolean;
  position: PortfolioItem | null;
  quantity: number;
}

export function selectPlayerPosition(portfolio: PortfolioSnapshot, playerId: string): PlayerPositionSelection {
  const position = portfolio.items.find((item) => item.playerId === playerId) ?? null;
  return {
    isPortfolioEmpty: portfolio.items.length === 0,
    position,
    quantity: position?.quantity ?? 0,
  };
}

export function formatTradingNumber(value: number | null | undefined): string {
  return value == null ? "No disponible" : new Intl.NumberFormat("es-AR", { maximumFractionDigits: 20 }).format(value);
}

export function formatCredits(value: number | null | undefined): string {
  return value == null ? "No disponible" : `${formatTradingNumber(value)} créditos`;
}

const MAX_TOKEN_QUANTITY = 2_147_483_647;

export function parseTokenQuantity(text: string): number | null {
  if (!/^\d+$/.test(text)) return null;
  const quantity = Number(text);
  return Number.isSafeInteger(quantity) && quantity > 0 && quantity <= MAX_TOKEN_QUANTITY ? quantity : null;
}

export function estimatedOrderTotal(quantity: number, quoteValue: number): number {
  return Math.round((quantity * quoteValue + Number.EPSILON) * 100) / 100;
}

export interface BuyQuantityValidation {
  quantity: number | null;
  estimatedTotal: number | null;
  error: string | null;
}

export function validateBuyQuantity(text: string, quoteValue: number | null, creditBalance: number | null): BuyQuantityValidation {
  const quantity = parseTokenQuantity(text);
  if (quantity === null) return { quantity: null, estimatedTotal: null, error: "Ingresá una cantidad entera de 1 a 2.147.483.647 tokens" };
  if (quoteValue === null || !Number.isFinite(quoteValue) || quoteValue <= 0) {
    return { quantity, estimatedTotal: null, error: "No hay cotización vigente disponible" };
  }
  if (creditBalance === null || !Number.isFinite(creditBalance)) {
    return { quantity, estimatedTotal: null, error: "No hay saldo vigente disponible" };
  }
  const estimatedTotal = estimatedOrderTotal(quantity, quoteValue);
  if (!Number.isFinite(estimatedTotal) || estimatedTotal > creditBalance) {
    return { quantity, estimatedTotal, error: "El saldo disponible no alcanza para esta compra" };
  }
  return { quantity, estimatedTotal, error: null };
}

export type BuyFailureCode = "insufficient_balance" | "pool_tokens" | "pool_role" | "quote_unavailable" | "generic" | "uncertain";
export type SellFailureCode = "insufficient_holding" | "pool_balance" | "pool_role" | "quote_unavailable" | "generic" | "uncertain";
export interface OrderFailure {
  kind: "rejected" | "uncertain";
  code: BuyFailureCode | SellFailureCode;
  message: string;
}

export function classifyBuyError(error: unknown): OrderFailure {
  const status = (error as { status?: number } | null)?.status;
  const message = error instanceof Error ? error.message : "";
  if (status === 409 && message === "Insufficient credit balance") {
    return { kind: "rejected", code: "insufficient_balance", message: "Saldo insuficiente para comprar. Ajustá la cantidad o consultá el portfolio" };
  }
  if (status === 409 && message === "Insufficient tokens in central pool") {
    return { kind: "rejected", code: "pool_tokens", message: "El pool central no tiene tokens suficientes para esta compra" };
  }
  if (status === 409 && message === "The central pool cannot operate as an investor") {
    return { kind: "rejected", code: "pool_role", message: "Esta sesión no puede operar como inversor" };
  }
  if (status === 404 && message === "Current quote not available") {
    return { kind: "rejected", code: "quote_unavailable", message: "No hay cotización vigente disponible. Actualizá la cotización antes de operar" };
  }
  if (typeof status === "number" && status >= 400 && status < 500) {
    return { kind: "rejected", code: "generic", message: "La compra fue rechazada. Revisá los datos y consultá el portfolio" };
  }
  return { kind: "uncertain", code: "uncertain", message: "No se pudo confirmar el resultado de la compra. Consultá el portfolio antes de decidir si querés reintentar" };
}

export interface SellQuantityValidation {
  quantity: number | null;
  estimatedTotal: number | null;
  error: string | null;
}

export function validateSellQuantity(text: string, quoteValue: number | null, heldQuantity: number | null): SellQuantityValidation {
  const quantity = parseTokenQuantity(text);
  if (quantity === null) return { quantity: null, estimatedTotal: null, error: "Ingresá una cantidad entera de 1 a 2.147.483.647 tokens" };
  if (quoteValue === null || !Number.isFinite(quoteValue) || quoteValue <= 0) {
    return { quantity, estimatedTotal: null, error: "No hay cotización vigente disponible" };
  }
  if (heldQuantity === null || !Number.isFinite(heldQuantity) || heldQuantity < quantity) {
    return { quantity, estimatedTotal: null, error: "La tenencia vigente no alcanza para esta venta" };
  }
  const estimatedTotal = estimatedOrderTotal(quantity, quoteValue);
  if (!Number.isFinite(estimatedTotal)) {
    return { quantity, estimatedTotal, error: "No se pudo estimar el total de la venta" };
  }
  return { quantity, estimatedTotal, error: null };
}

export function classifySellError(error: unknown): OrderFailure {
  const status = (error as { status?: number } | null)?.status;
  const message = error instanceof Error ? error.message : "";
  if (status === 409 && message === "Insufficient token holding") {
    return { kind: "rejected", code: "insufficient_holding", message: "Tenencia insuficiente para vender. Ajustá la cantidad o consultá el portfolio" };
  }
  if (status === 409 && message === "Insufficient central pool balance") {
    return { kind: "rejected", code: "pool_balance", message: "El pool central no tiene saldo suficiente para esta venta" };
  }
  if (status === 409 && message === "The central pool cannot operate as an investor") {
    return { kind: "rejected", code: "pool_role", message: "Esta sesión no puede operar como inversor" };
  }
  if (status === 404 && message === "Current quote not available") {
    return { kind: "rejected", code: "quote_unavailable", message: "No hay cotización vigente disponible. Actualizá la cotización antes de operar" };
  }
  if (typeof status === "number" && status >= 400 && status < 500) {
    return { kind: "rejected", code: "generic", message: "La venta fue rechazada. Revisá los datos y consultá el portfolio" };
  }
  return { kind: "uncertain", code: "uncertain", message: "No se pudo confirmar el resultado de la venta. Consultá el portfolio antes de decidir si querés reintentar" };
}
