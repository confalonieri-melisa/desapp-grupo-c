import type { PlayerQuoteDto } from "@/frontend/services/client/player-quotes.service";

export const playerA = "00000000-0000-4000-8000-000000000801";
export const playerB = "00000000-0000-4000-8000-000000000802";
export const quote: PlayerQuoteDto = {
  playerId: playerA,
  quoteValue: 0,
  unit: "CREDIT_PER_TOKEN",
  calculatedAt: "2026-10-20T10:02:03.123456Z",
  strategyCode: "CUSTOM_STRATEGY",
  strategyVersion: "1.0.0",
  score: {
    individualScore: 0,
    teamScore: null,
    finalScore: 0,
    components: { contributions: [{ metric: "goals", value: 0, enabled: false, range: [0, 1], missing: null }], empty: {}, text: "texto ".repeat(40) },
  },
};

// Deliberately retain identical metadata and duplicate records in the received order.
export const history = { items: [quote, { ...quote, quoteValue: 12.3456789 }, quote, { ...quote, calculatedAt: "2026-10-20T10:02:03.123455Z" }, { ...quote, calculatedAt: "2026-10-19T10:02:03Z" }] };
export const emptyHistory = { items: [] };
