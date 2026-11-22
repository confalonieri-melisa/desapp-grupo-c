import { toHttpResponse } from "@/backend/errors/to-http-response";
import { requireSuperuser } from "@/backend/middlewares/auth.middleware";
import { emptyRecalculationRequestSchema } from "@/backend/schemas/valuation.schema";
import { BatchExecutionService } from "@/backend/services/batch-execution.service";
import { requestObservation } from "@/backend/observability/request-observation";

const service = new BatchExecutionService();

export async function POST(request: Request): Promise<Response> {
  return requestObservation.observe(
    request,
    "/api/quotes/recalculate",
    async (_observed, correlationId) => {
      try {
        requireSuperuser(request);
        emptyRecalculationRequestSchema.parse(await request.json());
        return Response.json(await service.runManualRecalculation(correlationId));
      } catch (error) {
        return toHttpResponse(error);
      }
    },
  );
}
