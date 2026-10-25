import { ConflictError } from "@/backend/errors/http.error";
import { PlayerRankingRepository } from "@/backend/repositories/player-ranking.repository";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";
import { toPagination } from "@/backend/utils/pagination";
import type {
  PlayerRankingCriteria,
  PlayerRankingRow,
  PlayerRankingResponse,
  RankedPlayer,
} from "@/backend/services/player-ranking.types";

export class PlayerRankingService {
  constructor(
    private readonly rankingRepository = new PlayerRankingRepository(),
    private readonly valuationRepository = new ValuationRepository(),
  ) {}

  async getRanking(criteria: PlayerRankingCriteria): Promise<PlayerRankingResponse> {
    const active = await this.valuationRepository.findActiveStrategyVersion();
    if (!active) throw new ConflictError("No active valuation strategy");

    const ranking = await this.rankingRepository.findRankedPlayers(active.id, criteria);
    const firstRank = (criteria.page - 1) * criteria.limit + 1;

    return {
      strategyCode: active.strategyCode,
      strategyVersion: active.version,
      players: ranking.rows.map((row, index) => this.toRankedPlayer(row, firstRank + index)),
      pagination: toPagination(ranking.total, ranking.page, ranking.limit),
    };
  }

  private toRankedPlayer(row: PlayerRankingRow, rank: number): RankedPlayer {
    return {
      rank,
      player: {
        id: row.playerId,
        name: row.name,
        team: row.team,
        league: row.league,
        position: row.position,
      },
      finalScore: row.finalScore,
      quoteValue: row.quoteValue,
      unit: row.unit,
      calculatedAt: row.calculatedAt,
    };
  }

}
