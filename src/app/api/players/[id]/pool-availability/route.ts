import { PoolAvailabilityController } from "@/backend/controllers/pool-availability.controller";
import { requireAuth } from "@/backend/middlewares/auth.middleware";
import { toHttpResponse } from "@/backend/errors/to-http-response";
import { BadRequestError } from "@/backend/errors/http.error";
import { requestObservation } from "@/backend/observability/request-observation";
import { playerParamsSchema } from "@/backend/schemas/player.schema";
import { validate } from "@/backend/utils/validate";
const controller = new PoolAvailabilityController();
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return requestObservation.observe(request, "/api/players/:id/pool-availability", async () => {
    try {
      requireAuth(request);
      const { id } = validate(playerParamsSchema, await context.params);
      if (new URL(request.url).searchParams.size || request.body)
        throw new BadRequestError("Unexpected parameters");
      return Response.json(await controller.getAvailability(id));
    } catch (error) {
      return toHttpResponse(error);
    }
  });
}
