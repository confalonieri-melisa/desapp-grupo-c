import { MetricsController } from "@/backend/controllers/metrics.controller";
import { requestObservation } from "@/backend/observability/request-observation";

const controller = new MetricsController();

export function GET(request: Request): Promise<Response> {
  return requestObservation.observe(
    request,
    "/api/metrics",
    () =>
      new Response(controller.getOperationalMetrics(), {
        status: 200,
        headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
      }),
  );
}
