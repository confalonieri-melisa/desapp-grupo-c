import { describe, expect, it } from "vitest";
import type { PortfolioItem, PortfolioSnapshot } from "@/frontend/services/client/player-trading.service";
import { classifyBuyError, classifySellError, estimatedOrderTotal, formatCredits, formatTradingNumber, parseTokenQuantity, selectPlayerPosition, validateBuyQuantity, validateSellQuantity } from "@/frontend/features/profile/utils/player-trading";

const ownPosition: PortfolioItem = {
  playerId: "player-1",
  quantity: 3,
  averagePurchasePrice: 12.5,
  currentQuoteValue: 0,
  currentValue: -2,
  unrealizedPnl: -39.5,
};

describe("posición del jugador en el perfil", () => {
  it("selecciona únicamente el playerId exacto y conserva las métricas recibidas", () => {
    const other = { ...ownPosition, playerId: "player-10", quantity: 99, averagePurchasePrice: 999 };
    const snapshot: PortfolioSnapshot = { creditBalance: 0, items: [other, ownPosition] };

    expect(selectPlayerPosition(snapshot, "player-1")).toEqual({
      isPortfolioEmpty: false,
      position: ownPosition,
      quantity: 3,
    });
    expect(snapshot.items[0]).toBe(other);
    expect(ownPosition.currentValue).toBe(-2);
    expect(ownPosition.unrealizedPnl).toBe(-39.5);
  });

  it("distingue portfolio vacío de ausencia de posición en el jugador", () => {
    expect(selectPlayerPosition({ creditBalance: 13, items: [] }, "player-1")).toEqual({
      isPortfolioEmpty: true, position: null, quantity: 0,
    });
    expect(selectPlayerPosition({ creditBalance: 13, items: [{ ...ownPosition, playerId: "player-2" }] }, "player-1"))
      .toEqual({ isPortfolioEmpty: false, position: null, quantity: 0 });
  });

  it("representa tenencia cero sin crear promedio, valor o PnL de una posición inexistente", () => {
    const view = selectPlayerPosition({ creditBalance: 0, items: [] }, "player-1");
    expect(view.quantity).toBe(0);
    expect(view.position).toBeNull();
    expect(formatTradingNumber(view.position?.averagePurchasePrice)).toBe("No disponible");
    expect(formatTradingNumber(view.position?.currentValue)).toBe("No disponible");
    expect(formatTradingNumber(view.position?.unrealizedPnl)).toBe("No disponible");
  });

  it("presenta null como ausente y conserva cero, negativos y promedio recibido", () => {
    const position = { ...ownPosition, averagePurchasePrice: 12.345, currentQuoteValue: null, currentValue: 0 };
    const selected = selectPlayerPosition({ creditBalance: -1.5, items: [position] }, "player-1");
    expect(formatTradingNumber(selected.position?.averagePurchasePrice)).toBe("12,345");
    expect(formatTradingNumber(selected.position?.currentQuoteValue)).toBe("No disponible");
    expect(formatTradingNumber(selected.position?.currentValue)).toBe("0");
    expect(formatTradingNumber(selected.position?.unrealizedPnl)).toBe("-39,5");
    expect(formatCredits(-1.5)).toBe("-1,5 créditos");
    expect(formatCredits(null)).toBe("No disponible");
  });
});

describe("validación orientativa de compra", () => {
  it.each(["", " ", "0", "-1", "+1", "1.5", "1e2", "3 tokens", " 3", "3 ", "2147483648", "9007199254740993"])(
    "rechaza cantidad inválida %j sin convertir parcialmente el texto",
    (input) => expect(parseTokenQuantity(input)).toBeNull(),
  );

  it.each([["1", 1], ["0002", 2], ["2147483647", 2147483647]])(
    "acepta cantidad entera decimal %s dentro de rango",
    (input, quantity) => expect(parseTokenQuantity(input)).toBe(quantity),
  );

  it("redondea el costo orientativo a centavos antes de compararlo con saldo vigente", () => {
    expect(estimatedOrderTotal(3, 0.335)).toBe(1.01);
    expect(validateBuyQuantity("3", 0.335, 1)).toMatchObject({ quantity: 3, estimatedTotal: 1.01, error: expect.stringMatching(/saldo/i) });
    expect(validateBuyQuantity("3", 0.335, 1.01)).toEqual({ quantity: 3, estimatedTotal: 1.01, error: null });
    expect(validateBuyQuantity("3", null, 2).error).toMatch(/cotización/i);
    expect(validateBuyQuantity("3", 0.335, null).error).toMatch(/saldo/i);
    expect(validateBuyQuantity("1e2", 1, 1000).quantity).toBeNull();
  });

  it.each([
    [409, "Insufficient credit balance", "insufficient_balance"],
    [409, "Insufficient tokens in central pool", "pool_tokens"],
    [409, "The central pool cannot operate as an investor", "pool_role"],
    [404, "Current quote not available", "quote_unavailable"],
  ] as const)("clasifica solo rechazo conocido %i %s", (status, message, code) => {
    expect(classifyBuyError(Object.assign(new Error(message), { status }))).toMatchObject({ kind: "rejected", code });
  });

  it.each([
    [409, "Other conflict"], [404, "Player not found"], [400, "Invalid quantity"],
    [409, "Insufficient token holding"], [404, "Current quote not available now"],
  ] as const)("mantiene genérico rechazo no especificado %i %s", (status, message) => {
    expect(classifyBuyError(Object.assign(new Error(message), { status }))).toMatchObject({ kind: "rejected", code: "generic" });
  });

  it("trata red, 5xx y respuesta ilegible como resultado indeterminado", () => {
    expect(classifyBuyError(new TypeError("Network failed"))).toMatchObject({ kind: "uncertain", code: "uncertain" });
    expect(classifyBuyError(Object.assign(new Error("Server error"), { status: 500 }))).toMatchObject({ kind: "uncertain", code: "uncertain" });
    expect(classifyBuyError(Object.assign(new Error("JSON ilegible"), { status: 201 }))).toMatchObject({ kind: "uncertain", code: "uncertain" });
  });
});

describe("validación orientativa de venta", () => {
  it("rechaza vender sin tenencia vigente o más tokens que los poseídos", () => {
    expect(validateSellQuantity("1", 8, 0)).toMatchObject({ quantity: 1, error: expect.stringMatching(/tenencia/i) });
    expect(validateSellQuantity("4", 8, 3)).toMatchObject({ quantity: 4, error: expect.stringMatching(/tenencia/i) });
    expect(validateSellQuantity("1", 8, null).error).toMatch(/tenencia/i);
    expect(validateSellQuantity("0", 8, 3).quantity).toBeNull();
  });

  it("admite venta parcial y total con precio orientativo redondeado", () => {
    expect(validateSellQuantity("2", 0.335, 3)).toEqual({ quantity: 2, estimatedTotal: 0.67, error: null });
    expect(validateSellQuantity("3", 0.335, 3)).toEqual({ quantity: 3, estimatedTotal: 1.01, error: null });
    expect(validateSellQuantity("3", null, 3).error).toMatch(/cotización/i);
  });

  it("tras una venta total toma el GET sin posición como cero, sin inventar métricas", () => {
    const before = selectPlayerPosition({ creditBalance: 100, items: [ownPosition] }, "player-1");
    const after = selectPlayerPosition({ creditBalance: 101.01, items: [] }, "player-1");
    expect(before.quantity).toBe(3);
    expect(after).toMatchObject({ isPortfolioEmpty: true, position: null, quantity: 0 });
    expect(formatTradingNumber(after.position?.averagePurchasePrice)).toBe("No disponible");
    expect(formatTradingNumber(after.position?.currentValue)).toBe("No disponible");
    expect(formatTradingNumber(after.position?.unrealizedPnl)).toBe("No disponible");
  });

  it.each([
    [409, "Insufficient token holding", "insufficient_holding"],
    [409, "Insufficient central pool balance", "pool_balance"],
    [404, "Current quote not available", "quote_unavailable"],
  ] as const)("clasifica rechazo conocido de venta %i %s", (status, message, code) => {
    expect(classifySellError(Object.assign(new Error(message), { status }))).toMatchObject({ kind: "rejected", code });
  });

  it.each([[409, "Unknown conflict"], [409, "Insufficient credit balance"], [404, "Player not found"]] as const)(
    "no atribuye motivo a rechazo ajeno a la venta %i %s",
    (status, message) => expect(classifySellError(Object.assign(new Error(message), { status }))).toMatchObject({ kind: "rejected", code: "generic" }),
  );

  it("deja red y 5xx como resultado indeterminado", () => {
    expect(classifySellError(new TypeError("Offline"))).toMatchObject({ kind: "uncertain", code: "uncertain" });
    expect(classifySellError(Object.assign(new Error("Server error"), { status: 500 }))).toMatchObject({ kind: "uncertain", code: "uncertain" });
  });
});
