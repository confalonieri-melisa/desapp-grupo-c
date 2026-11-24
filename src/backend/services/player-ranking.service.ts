import { ConflictError } from "@/backend/errors/http.error";
import { PlayerRankingRepository } from "@/backend/repositories/player-ranking.repository";
import { BatchJobRepository } from "@/backend/repositories/batch-job.repository";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";
import { PlayerRankingCache } from "@/backend/services/player-ranking-cache";
import { toPagination } from "@/backend/utils/pagination";
import type {
  PlayerRankingCriteria,
  PlayerRankingRow,
  PlayerRankingResponse,
  RankedPlayer,
} from "@/backend/services/player-ranking.types";

const processRankingCache = new PlayerRankingCache();

export class PlayerRankingService {
  constructor(
    private readonly rankingRepository = new PlayerRankingRepository(),
    private readonly valuationRepository = new ValuationRepository(),
    private readonly batchJobRepository = new BatchJobRepository(),
    private readonly cache = processRankingCache,
  ) {}

  async getRanking(criteria: PlayerRankingCriteria): Promise<PlayerRankingResponse> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const active = await this.valuationRepository.findActiveStrategyVersion();
      if (!active) throw new ConflictError("No active valuation strategy");
      const revision = await this.batchJobRepository.getRankingPublicationRevision();
      if (attempt === 0) {
        const cached = this.cache.get(active.id, criteria, revision);
        if (cached) return cached;
      }

      const ranking = await this.rankingRepository.findRankedPlayers(active.id, criteria);
      const firstRank = (criteria.page - 1) * criteria.limit + 1;
      const response: PlayerRankingResponse = {
        strategyCode: active.strategyCode,
        strategyVersion: active.version,
        players: ranking.rows.map((row, index) => this.toRankedPlayer(row, firstRank + index)),
        pagination: toPagination(ranking.total, ranking.page, ranking.limit),
      };

      const latestActive = await this.valuationRepository.findActiveStrategyVersion();
      const latestRevision = await this.batchJobRepository.getRankingPublicationRevision();
      if (latestActive?.id === active.id && latestRevision === revision) {
        this.cache.put(active.id, criteria, revision, response);
        return response;
      }
      if (attempt === 1) return response;
    }
    throw new Error("Ranking retry exhausted");
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
