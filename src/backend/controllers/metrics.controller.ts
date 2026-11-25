import { httpMetrics as defaultHttpMetrics } from "@/backend/observability/http-metrics";
import { MetricsService } from "@/backend/services/metrics.service";

export class MetricsController {
  constructor(
    private readonly service = new MetricsService(),
    private readonly httpMetrics = defaultHttpMetrics,
  ) {}

  getOperationalMetrics(): string {
    return this.httpMetrics.toPrometheus();
  }

  async getAdvancedMetrics() {
    return this.service.getAdvancedMetrics();
  }
}
