import { MetricsController } from "@/backend/controllers/metrics.controller";
import { requestObservation } from "@/backend/observability/request-observation";

const controller = new MetricsController();

export function GET(request: Request): Promise<Response> {
  return requestObservation.observe(request, "/api/metrics/advanced", async () =>
    Response.json(await controller.getAdvancedMetrics()),
  );
}
