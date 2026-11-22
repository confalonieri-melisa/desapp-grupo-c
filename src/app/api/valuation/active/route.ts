import { toHttpResponse } from "@/backend/errors/to-http-response";
import { requireSuperuser } from "@/backend/middlewares/auth.middleware";
import { valuationActivationSchema } from "@/backend/schemas/valuation.schema";
import { ValuationStrategyService } from "@/backend/services/valuation-strategy.service";
import { requestObservation } from "@/backend/observability/request-observation";

const service = new ValuationStrategyService();

export async function POST(request: Request): Promise<Response> {
  return requestObservation.observe(request, "/api/valuation/active", async () => {
    try {
      const auth = requireSuperuser(request);
      const body = valuationActivationSchema.parse(await request.json());
      return Response.json(await service.activate(body.strategyCode, auth.sub));
    } catch (error) {
      return toHttpResponse(error);
    }
  });
}
