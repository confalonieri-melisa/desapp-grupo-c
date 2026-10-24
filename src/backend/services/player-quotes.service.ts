import { NotFoundError } from "@/backend/errors/http.error";
import { PlayerRepository } from "@/backend/repositories/player.repository";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";

export class PlayerQuotesService {
  constructor(private readonly playerRepository = new PlayerRepository(), private readonly valuationRepository = new ValuationRepository()) {}

  async getQuotes(playerId: string, date?: string) {
    const player = await this.playerRepository.findById(playerId);
    if (!player) throw new NotFoundError("Player not found");

    if (!date) {
      return this.valuationRepository.findHistoryByPlayerId(playerId);
    }

    const quote = await this.valuationRepository.findLatestQuoteBefore(playerId, nextDayStartUtc(date));
    if (!quote) throw new NotFoundError("Quote not available for the requested date");
    return [quote];
  }
}

function nextDayStartUtc(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1));
}
