import { env } from "@/backend/config/env";
import { ConflictError } from "@/backend/errors/http.error";
import { CompetitionContextRepository } from "@/backend/repositories/competition-context.repository";
import { PlayerRepository } from "@/backend/repositories/player.repository";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";
import { ValuationEngine } from "@/backend/services/valuation-engine";
import type {
  TeamContext,
  ValuationConfig,
  ValuationStrategyCode,
} from "@/backend/models/valuation";
import { VALUATION_STRATEGY_CODES } from "@/backend/models/valuation";

type PlayerToQuote = Awaited<ReturnType<PlayerRepository["findAll"]>>[number];
type ActiveVersion = NonNullable<Awaited<ReturnType<ValuationRepository["findActiveStrategyVersion"]>>>;
type TeamContextsByPlayer = ReadonlyMap<string, TeamContext | null>;
type RecalculationQuote = { playerId: string; quoteValue: number; teamScore: number | null };
type RecalculationError = { playerId: string; error: string };
type PlayerRecalculationOutcome = {
  result?: RecalculationQuote;
  error?: RecalculationError;
};
type RecalculationOutcome = {
  results: RecalculationQuote[];
  errors: RecalculationError[];
};

export class QuoteRecalculationService {
  constructor(
    private readonly valuationRepository = new ValuationRepository(),
    private readonly playerRepository = new PlayerRepository(),
    private readonly contextRepository = new CompetitionContextRepository(),
    private readonly engine = new ValuationEngine(),
  ) {}

  async recalculate() {
    const active = await this.findActiveStrategyVersion();
    const valuationPlayers = await this.playerRepository.findPlayersForValuation();
    const players = valuationPlayers.players;
    const strategyCode = active.strategyCode as ValuationStrategyCode;
    const config = active.configuration as ValuationConfig;
    const contexts = await this.resolveTeamContexts(players, strategyCode);
    const outcome = await this.recalculatePlayers(
      active,
      players,
      contexts,
      strategyCode,
      config,
    );
    return buildRecalculationResponse(active, {
      results: outcome.results,
      errors: [...valuationPlayers.rejected, ...outcome.errors],
    });
  }

  private async findActiveStrategyVersion() {
    const active = await this.valuationRepository.findActiveStrategyVersion();
    if (!active) throw new ConflictError("No active valuation strategy");
    return active;
  }

  private async resolveTeamContexts(players: PlayerToQuote[], strategyCode: ValuationStrategyCode): Promise<TeamContextsByPlayer> {
    const contextsByPlayer = new Map<string, TeamContext | null>();

    for (const player of players) {
      contextsByPlayer.set(
        player.id,
        await this.resolveTeamContextForPlayer(player, strategyCode),
      );
    }

    return contextsByPlayer;
  }

  private async resolveTeamContextForPlayer(player: PlayerToQuote, strategyCode: ValuationStrategyCode): Promise<TeamContext | null> {
    if (strategyCode !== VALUATION_STRATEGY_CODES.INDIVIDUAL_PLUS_TEAM_CONTEXT) return null;
    const context = await this.contextRepository.findTeamContext(
      player.league,
      env.CURRENT_MARKET_SEASON,
      player.team,
    );
    return context ? {
      contextUpdateId: context.updateId,
      position: context.position,
      points: context.points,
      playedGames: context.playedGames,
      goalDifference: context.goalDifference,
    } : null;
  }

  private async recalculatePlayers(
    active: ActiveVersion,
    players: PlayerToQuote[],
    contexts: TeamContextsByPlayer,
    strategyCode: ValuationStrategyCode,
    config: ValuationConfig,
  ) {
    const results: RecalculationQuote[] = [];
    const errors: RecalculationError[] = [];
    for (const player of players) {
      const outcome = await this.recalculatePlayer(
        active,
        player,
        contexts.get(player.id),
        strategyCode,
        config,
      );
      if (outcome.error) errors.push(outcome.error);
      if (outcome.result) results.push(outcome.result);
    }
    return { results, errors };
  }

  private async recalculatePlayer(
    active: ActiveVersion,
    player: PlayerToQuote,
    context: TeamContext | null | undefined,
    strategyCode: ValuationStrategyCode,
    config: ValuationConfig,
  ): Promise<PlayerRecalculationOutcome> {
    try {
      const result = this.engine.calculate(
        player,
        strategyCode,
        config,
        context ?? undefined,
        active.version,
      );
      await this.saveQuote(active.id, player, context, result);
      return {
        result: { playerId: player.id, quoteValue: result.quoteValue, teamScore: result.teamScore },
      };
    } catch (error) {
      return {
        error: {
          playerId: player.id,
          error: error instanceof Error ? error.message : "Unable to calculate quote",
        },
      };
    }
  }

  private saveQuote(
    strategyVersionId: string,
    player: PlayerToQuote,
    context: TeamContext | null | undefined,
    result: ReturnType<ValuationEngine["calculate"]>,
  ) {
    return this.valuationRepository.saveQuote({
      playerId: player.id,
      strategyVersionId,
      individualScore: result.individualScore,
      teamScore: result.teamScore,
      finalScore: result.finalScore,
      quoteValue: result.quoteValue,
      contextUpdateId: context?.contextUpdateId,
      explanation: result.explanation,
    });
  }
}

function buildRecalculationResponse(active: ActiveVersion, outcome: RecalculationOutcome) {
  const { results, errors } = outcome;
  return {
    status: errors.length ? (results.length ? "PARTIAL" : "FAILED") : "COMPLETED",
    season: env.CURRENT_MARKET_SEASON,
    strategyCode: active.strategyCode,
    version: active.version,
    calculated: results.length,
    rejected: errors.length,
    quotes: results,
    errors,
  };
}
