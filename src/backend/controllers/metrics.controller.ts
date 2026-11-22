import { PlayerRepository } from "@/backend/repositories/player.repository";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";
import { httpMetrics as defaultHttpMetrics } from "@/backend/observability/http-metrics";

export class MetricsController {
  constructor(
    private readonly playerRepository = new PlayerRepository(),
    private readonly valuationRepository = new ValuationRepository(),
    private readonly httpMetrics = defaultHttpMetrics,
  ) {}

  getOperationalMetrics(): string {
    return this.httpMetrics.toPrometheus();
  }

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
