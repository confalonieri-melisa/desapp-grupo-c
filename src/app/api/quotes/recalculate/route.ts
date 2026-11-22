import { toHttpResponse } from "@/backend/errors/to-http-response";
import { requireSuperuser } from "@/backend/middlewares/auth.middleware";
import { emptyRecalculationRequestSchema } from "@/backend/schemas/valuation.schema";
import { QuoteRecalculationService } from "@/backend/services/quote-recalculation.service";
import { requestObservation } from "@/backend/observability/request-observation";

const service = new QuoteRecalculationService();

export async function POST(request: Request): Promise<Response> {
  return requestObservation.observe(request, "/api/quotes/recalculate", async () => {
    try {
      requireSuperuser(request);
      emptyRecalculationRequestSchema.parse(await request.json());
      return Response.json(await service.recalculate());
    } catch (error) {
      return toHttpResponse(error);
    }
  });
}
