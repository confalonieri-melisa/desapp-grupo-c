import type { PlayerQuoteSnapshot } from "@/backend/models/valuation";
import { PlayerQuotesService } from "@/backend/services/player-quotes.service";

export class PlayerQuotesController {
  constructor(private readonly service: PlayerQuotesService) {}

  async getQuotes(playerId: string, date?: string) {
    const rows = await this.service.getQuotes(playerId, date);
    return { items: rows.map(toPlayerQuoteResponse) };
  }
}

function toPlayerQuoteResponse(row: PlayerQuoteSnapshot) {
  return {
    playerId: row.playerId,
    quoteValue: row.quoteValue,
    unit: row.unit,
    calculatedAt: row.calculatedAt,
    strategyCode: row.strategyCode,
    strategyVersion: row.strategyVersion,
    score: {
      individualScore: row.individualScore,
      teamScore: row.teamScore,
      finalScore: row.finalScore,
      components: row.explanation,
    },
  };
}
