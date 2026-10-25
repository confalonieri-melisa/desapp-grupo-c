import { toHttpResponse } from "@/backend/errors/to-http-response";
import { requireAuth } from "@/backend/middlewares/auth.middleware";
import {
  marketOperationHistoryParamsSchema,
  marketOperationHistoryQuerySchema,
} from "@/backend/schemas/market-operation.schema";
import { MarketOperationController } from "@/backend/controllers/market-operation.controller";
import { MarketOperationService } from "@/backend/services/market-operation.service";
import { validate } from "@/backend/utils/validate";

const controller = new MarketOperationController(
  new MarketOperationService(),
);

interface TransactionHistoryRouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: TransactionHistoryRouteProps): Promise<Response> {
  try {
    const auth = requireAuth(request);
    const { id } = validate(marketOperationHistoryParamsSchema, await params);
    const query = validate(
      marketOperationHistoryQuerySchema,
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );

    return Response.json(await controller.getHistory(auth, id, query));
  } catch (error) {
    return toHttpResponse(error);
  }
}
