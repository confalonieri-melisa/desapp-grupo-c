import { HealthController } from "@/backend/controllers/health.controller";
import { requestObservation } from "@/backend/observability/request-observation";

const controller = new HealthController();

export function GET(request: Request): Promise<Response> {
  return requestObservation.observe(request, "/api/health/live", () =>
    Response.json(controller.getLiveness(), { status: 200 }),
  );
}
