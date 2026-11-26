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
type ActiveStrategyVersion = NonNullable<
  Awaited<ReturnType<ValuationRepository["findActiveStrategyVersion"]>>
>;

type RankingState = {
  activeStrategy: ActiveStrategyVersion;
  publicationRevision: number;
};

type RankingAttempt = {
  response: PlayerRankingResponse;
  stateChanged: boolean;
};

export class PlayerRankingService {
  constructor(
    private readonly rankingRepository = new PlayerRankingRepository(),
    private readonly valuationRepository = new ValuationRepository(),
    private readonly batchJobRepository = new BatchJobRepository(),
    private readonly cache = processRankingCache,
  ) {}

  async getRanking(criteria: PlayerRankingCriteria): Promise<PlayerRankingResponse> {
    const firstAttempt = await this.readRankingAttempt(criteria, true);
    if (!firstAttempt.stateChanged) return firstAttempt.response;

    const secondAttempt = await this.readRankingAttempt(criteria, false);
    return secondAttempt.response;
  }

  private async readRankingAttempt(criteria: PlayerRankingCriteria, allowReuse: boolean): Promise<RankingAttempt> {
    const initialState = await this.resolveCurrentRankingState();
    if (allowReuse) {
      const cached = this.cache.get(
        initialState.activeStrategy.id,
        criteria,
        initialState.publicationRevision,
      );
      if (cached) return { response: cached, stateChanged: false };
    }

    const response = await this.buildRankingResponse(initialState, criteria);
    const currentState = await this.resolveCurrentRankingState();
    const stateIsCurrent = this.isRankingStateUnchanged(initialState, currentState);

    if (stateIsCurrent) {
      this.cache.put(
        initialState.activeStrategy.id,
        criteria,
        initialState.publicationRevision,
        response,
      );
    }
    return { response, stateChanged: !stateIsCurrent };
  }

  private async resolveCurrentRankingState(): Promise<RankingState> {
    const activeStrategy = await this.valuationRepository.findActiveStrategyVersion();
    if (!activeStrategy) throw new ConflictError("No active valuation strategy");
    return {
      activeStrategy,
      publicationRevision: await this.batchJobRepository.getRankingPublicationRevision(),
    };
  }

  private async buildRankingResponse(state: RankingState, criteria: PlayerRankingCriteria): Promise<PlayerRankingResponse> {
    const ranking = await this.rankingRepository.findRankedPlayers(state.activeStrategy.id, criteria);
    const firstRank = (criteria.page - 1) * criteria.limit + 1;

    return {
      strategyCode: state.activeStrategy.strategyCode,
      strategyVersion: state.activeStrategy.version,
      players: ranking.rows.map((row, index) => this.toRankedPlayer(row, firstRank + index)),
      pagination: toPagination(ranking.total, ranking.page, ranking.limit),
    };
  }

  private isRankingStateUnchanged(initialState: RankingState, currentState: RankingState): boolean {
    return (
      initialState.activeStrategy.id === currentState.activeStrategy.id &&
      initialState.publicationRevision === currentState.publicationRevision
    );
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
