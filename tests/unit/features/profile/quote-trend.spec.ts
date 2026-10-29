import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import QuoteTrend, { buildQuoteTrend } from "@/frontend/features/profile/components/QuoteTrend/QuoteTrend";
import type { PlayerQuoteDto } from "@/frontend/services/client/player-quotes.service";

const quote = (value: number, date: string): PlayerQuoteDto => ({
  playerId: "player-a", quoteValue: value, unit: "CREDIT_PER_TOKEN",
  calculatedAt: date, strategyCode: "TEST", strategyVersion: "1",
});
const render = (items: PlayerQuoteDto[]) => renderToStaticMarkup(createElement(QuoteTrend, { items, playerName: "Jugador A" }));

describe("player quote trend", () => {
  it("orders real quotes chronologically and shows an increase", () => {
    const quotes = [quote(15, "2026-10-02T12:00:00.000Z"), quote(10, "2026-10-01T12:00:00.000Z")];
    const html = render(quotes);
    expect(buildQuoteTrend(quotes).map((point) => point.value)).toEqual([10, 15]);
    expect(html).toContain("Créditos por token");
    expect(html).not.toContain("Subió 5,0000 créditos por token");
    expect(html).toContain("Subió.");
    expect(html).toContain("el 01/10/2026");
    expect(html).toContain("el 02/10/2026");
    expect(html).not.toContain(">01/10/2026");
    expect(html).toContain("Evolución de Jugador A");
  });

  it("shows a decline and a flat trend without inventing points", () => {
    expect(render([quote(20, "2026-10-01T12:00:00.000Z"), quote(15, "2026-10-02T12:00:00.000Z")]))
      .not.toContain("Bajó 5,0000 créditos por token");
    const flat = render([quote(10, "2026-10-01T12:00:00.000Z"), quote(10, "2026-10-02T12:00:00.000Z")]);
    expect(flat).toContain("Sin cambios");
  });

  it("spaces points by elapsed time when quote dates are irregular", () => {
    const data = buildQuoteTrend([
      quote(10, "2026-10-01T12:00:00.000Z"),
      quote(11, "2026-10-02T12:00:00.000Z"),
      quote(15, "2026-10-11T12:00:00.000Z"),
    ]);
    expect(data).toHaveLength(3);
    expect(data[1].timestamp - data[0].timestamp).toBe(24 * 60 * 60 * 1000);
    expect(data[2].timestamp - data[0].timestamp).toBe(10 * 24 * 60 * 60 * 1000);
  });

  it("shows only the 15 most recent quotes and tells the user when older ones are hidden", () => {
    const quotes = Array.from({ length: 17 }, (_, index) => quote(index, `2026-10-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`)).reverse();
    const data = buildQuoteTrend(quotes);
    expect(data).toHaveLength(15);
    expect(data[0].value).toBe(2);
    expect(data[14].value).toBe(16);
    const html = render(quotes);
    expect(html).toContain("Últimas 15 de 17 cotizaciones");
    expect(html).toContain("2,0000 créditos por token el 03/10/2026");
    expect(html).toContain("16,0000 créditos por token el 17/10/2026");
  });

  it("rounds displayed amounts to four decimal places", () => {
    const html = render([quote(26.567891, "2026-10-01T12:00:00.000Z"), quote(27.691347, "2026-10-02T12:00:00.000Z")]);
    expect(html).toContain("26,5679 créditos por token");
    expect(html).toContain("27,6913 créditos por token");
    expect(html).not.toContain("Subió 1,1235 créditos por token");
    expect(html).not.toContain("26,567891");
  });

  it("explains when there are too few quotes for a trend", () => {
    expect(render([])).toContain("Todavía no hay cotizaciones");
    const single = render([quote(8, "2026-10-01T12:00:00.000Z")]);
    expect(single).toContain("Solo hay una cotización");
    expect(single).not.toContain("01/10/2026");
    expect(single).not.toContain("<svg");
  });
});
