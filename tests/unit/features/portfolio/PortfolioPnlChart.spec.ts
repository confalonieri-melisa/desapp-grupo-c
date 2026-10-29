import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PortfolioPnlChart } from "@/frontend/features/portfolio/components/PortfolioPnlChart";
import type { PortfolioSnapshot } from "@/frontend/services/client/player-trading.service";

describe("unrealized result chart", () => {
  it("separates positive, negative, zero and missing results in text and position", () => {
    const snapshot: PortfolioSnapshot = { creditBalance: 0, items: [
      { playerId: "gain", quantity: 1, averagePurchasePrice: 0, currentQuoteValue: 5, currentValue: 5, unrealizedPnl: 5 },
      { playerId: "loss", quantity: 1, averagePurchasePrice: 5, currentQuoteValue: 2, currentValue: 2, unrealizedPnl: -3 },
      { playerId: "flat", quantity: 1, averagePurchasePrice: 0, currentQuoteValue: 0, currentValue: 0, unrealizedPnl: 0 },
      { playerId: "unknown", quantity: 1, averagePurchasePrice: 0, currentQuoteValue: null, currentValue: null, unrealizedPnl: null },
    ] };
    const html = renderToStaticMarkup(createElement(PortfolioPnlChart, { snapshot, names: {} }));
    expect(html).toContain("+5 créditos");
    expect(html).toContain("-3 créditos");
    expect(html).toContain("0 créditos");
    expect(html).toContain("Sin variación");
    expect(html).toContain("unknown: sin cotización");
    expect(html).toContain('href="/players/gain"');
    expect(html).toContain("Ver jugador");
    expect(html).not.toContain("Ver jugador y vender");
    expect(html).toMatch(/class="[^"]*positiveBar[^"]*"/);
    expect(html).toMatch(/class="[^"]*negativeBar[^"]*"/);
    expect(html.indexOf("gain")).toBeLessThan(html.indexOf("loss"));
    expect(html.indexOf("loss")).toBeLessThan(html.indexOf("flat"));
  });

  it("keeps the comparison axis and profile links when all results are zero", () => {
    const snapshot: PortfolioSnapshot = { creditBalance: 0, items: [
      { playerId: "flat", quantity: 1, averagePurchasePrice: 1, currentQuoteValue: 1, currentValue: 1, unrealizedPnl: 0 },
    ] };
    const html = renderToStaticMarkup(createElement(PortfolioPnlChart, { snapshot, names: {} }));
    expect(html).toContain("La ganancia o pérdida de todos los jugadores disponibles es cero");
    expect(html).toContain('href="/players/flat"');
    expect(html).toContain("pnlTrack");
    expect(html).toContain("Ganancia");
  });

  it("does not show a numeric scale when all results are unavailable", () => {
    const snapshot: PortfolioSnapshot = { creditBalance: 0, items: [
      { playerId: "missing", quantity: 1, averagePurchasePrice: 1, currentQuoteValue: null, currentValue: null, unrealizedPnl: null },
    ] };
    const html = renderToStaticMarkup(createElement(PortfolioPnlChart, { snapshot, names: {} }));
    expect(html).toContain("No hay datos de ganancia o pérdida para comparar.");
    expect(html).toContain('href="/players/missing"');
    expect(html).not.toContain("pnlTrack");
  });
});
