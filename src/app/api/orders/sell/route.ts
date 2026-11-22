import { MarketOperationController } from "@/backend/controllers/market-operation.controller";
import { toHttpResponse } from "@/backend/errors/to-http-response";
import { requireAuth } from "@/backend/middlewares/auth.middleware";
import { marketOperationRequestSchema } from "@/backend/schemas/market-operation.schema";
import { MarketOperationService } from "@/backend/services/market-operation.service";
import { requestObservation } from "@/backend/observability/request-observation";

const controller = new MarketOperationController(new MarketOperationService());

export async function POST(request: Request): Promise<Response> {
  return requestObservation.observe(request, "/api/orders/sell", async () => {
    try {
      const auth = requireAuth(request);
      const input = marketOperationRequestSchema.parse(await request.json());
      return Response.json(
        await controller.sell(auth, input, request.headers.get("x-correlation-id") ?? undefined),
        { status: 201 },
      );
    } catch (error) {
      return toHttpResponse(error);
    }
  });
}
