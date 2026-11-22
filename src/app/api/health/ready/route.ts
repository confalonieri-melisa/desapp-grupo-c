import { HealthController } from "@/backend/controllers/health.controller";
import { HEALTH_STATUS } from "@/backend/models/health";
import { requestObservation } from "@/backend/observability/request-observation";

const controller = new HealthController();

export async function GET(request: Request): Promise<Response> {
  return requestObservation.observe(request, "/api/health/ready", async () => {
    const health = await controller.getReadiness();
    return Response.json(health, { status: health.status === HEALTH_STATUS.OK ? 200 : 503 });
  });
}
