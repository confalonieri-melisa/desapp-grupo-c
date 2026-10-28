import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import QuoteTrend from "@/frontend/features/profile/components/QuoteTrend/QuoteTrend";
import type { PlayerQuoteDto } from "@/frontend/services/client/player-quotes.service";

const quote = (value: number, date: string): PlayerQuoteDto => ({
  playerId: "player-a", quoteValue: value, unit: "CREDIT_PER_TOKEN",
  calculatedAt: date, strategyCode: "TEST", strategyVersion: "1",
});
const render = (items: PlayerQuoteDto[]) => renderToStaticMarkup(createElement(QuoteTrend, { items, playerName: "Jugador A" }));

describe("player quote trend", () => {
  it("orders real quotes chronologically and shows an increase", () => {
    const html = render([quote(15, "2026-10-02T12:00:00.000Z"), quote(10, "2026-10-01T12:00:00.000Z")]);
    expect(html).toContain('points="8,60 232,12"');
    expect(html).toContain('fill="url(#quote-trend-fill)"');
    expect(html.match(/<circle /g)).toHaveLength(2);
    expect(html).toContain("Subió 5,0000 créditos por token");
    expect(html).toContain("el 01/10/2026");
    expect(html).toContain("el 02/10/2026");
    expect(html).not.toContain(">01/10/2026");
    expect(html).toContain("Evolución de Jugador A");
  });

  it("shows a decline and a flat trend without inventing points", () => {
    expect(render([quote(20, "2026-10-01T12:00:00.000Z"), quote(15, "2026-10-02T12:00:00.000Z")]))
      .toContain('points="8,12 232,60"');
    expect(render([quote(20, "2026-10-01T12:00:00.000Z"), quote(15, "2026-10-02T12:00:00.000Z")]))
      .toContain("Bajó 5,0000 créditos por token");
    const flat = render([quote(10, "2026-10-01T12:00:00.000Z"), quote(10, "2026-10-02T12:00:00.000Z")]);
    expect(flat).toContain('points="8,36 232,36"');
    expect(flat).toContain("Sin cambios");
  });

  it("spaces points by elapsed time when quote dates are irregular", () => {
    const html = render([
      quote(10, "2026-10-01T12:00:00.000Z"),
      quote(11, "2026-10-02T12:00:00.000Z"),
      quote(15, "2026-10-11T12:00:00.000Z"),
    ]);
    expect(html).toContain('points="8,60 30.4,50.4 232,12"');
    expect(html.match(/<circle /g)).toHaveLength(3);
  });

  it("rounds displayed amounts to four decimal places", () => {
    const html = render([quote(26.567891, "2026-10-01T12:00:00.000Z"), quote(27.691347, "2026-10-02T12:00:00.000Z")]);
    expect(html).toContain("26,5679 créditos por token");
    expect(html).toContain("27,6913 créditos por token");
    expect(html).toContain("Subió 1,1235 créditos por token");
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
