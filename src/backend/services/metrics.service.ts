import { PlayerRepository } from "@/backend/repositories/player.repository";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";

export class MetricsService {
  constructor(
    private readonly playerRepository = new PlayerRepository(),
    private readonly valuationRepository = new ValuationRepository(),
  ) {}

  async getAdvancedMetrics() {
    const [players, strategy] = await Promise.all([
      this.playerRepository.findAll(),
      this.valuationRepository.findActiveStrategyVersion(),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      players: players.length,
      strategy: strategy ? { code: strategy.strategyCode, version: strategy.version } : null,
    };
  }
}
