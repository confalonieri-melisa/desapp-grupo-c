import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import QuoteTrendCard from "@/frontend/features/profile/components/QuoteTrend/QuoteTrendCard";
import type { usePlayerQuotes } from "@/frontend/features/profile/hooks/usePlayerQuotes";
import { quote } from "./fixtures/player-quotes";

function quotesWith(items: typeof quote[]): ReturnType<typeof usePlayerQuotes> {
  return {
    expired: false, playerError: null, current: items[0],
    history: { status: items.length ? "success" : "empty", items, error: null, generation: 1 },
    dated: { status: "idle", items: [], error: null, generation: 0 },
    selectedDate: "", requestedDate: "", dateError: null,
    retryHistory: vi.fn(), setSelectedDate: vi.fn(), clearDate: vi.fn(), queryDate: vi.fn(),
  };
}

describe("player trend card", () => {
  it("shows a compact trend from the existing quote history", () => {
    const older = { ...quote, quoteValue: 8, calculatedAt: "2026-10-19T10:00:00.000Z" };
    const newer = { ...quote, quoteValue: 12, calculatedAt: "2026-10-20T10:00:00.000Z" };
    const html = renderToStaticMarkup(createElement(QuoteTrendCard, { quotes: quotesWith([newer, older]), playerName: "Jugador A" }));
    expect(html).toContain("Valor del jugador");
    expect(html).toContain('points="8,60 232,12"');
  });

  it("shows an honest empty state in the profile", () => {
    const html = renderToStaticMarkup(createElement(QuoteTrendCard, { quotes: quotesWith([]), playerName: "Jugador A" }));
    expect(html).toContain("Todavía no hay cotizaciones para mostrar la evolución");
    expect(html).not.toContain("<polyline");
  });
});
