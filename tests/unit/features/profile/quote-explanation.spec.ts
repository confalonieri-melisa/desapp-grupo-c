import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import QuoteExplanation from "@/frontend/features/profile/components/QuoteExplanation/QuoteExplanation";
import { quote } from "./fixtures/player-quotes";

describe("quote explanation", () => {
  it("hides the team score for an individual strategy", () => {
    const markup = renderToStaticMarkup(createElement(QuoteExplanation, { quote: { ...quote, strategyCode: "INDIVIDUAL_PERFORMANCE" }, context: "jugador" }));

    expect(markup).toContain("Score individual");
    expect(markup).toContain("Score final");
    expect(markup).not.toContain("Score colectivo");
  });

  it("shows an unavailable team score for a team strategy with missing context", () => {
    const markup = renderToStaticMarkup(createElement(QuoteExplanation, { quote: { ...quote, strategyCode: "INDIVIDUAL_PLUS_TEAM_CONTEXT" }, context: "jugador" }));

    expect(markup).toContain("Score colectivo</dt><dd>No disponible");
  });
});
