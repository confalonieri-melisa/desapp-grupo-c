import { PlayerQuotesController } from "@/backend/controllers/player-quotes.controller";
import { BadRequestError } from "@/backend/errors/http.error";
import { toHttpResponse } from "@/backend/errors/to-http-response";
import { requireAuth } from "@/backend/middlewares/auth.middleware";
import { PlayerRepository } from "@/backend/repositories/player.repository";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";
import {
  playerQuotesParamsSchema,
  playerQuotesQuerySchema,
} from "@/backend/schemas/player-quotes.schema";
import { PlayerQuotesService } from "@/backend/services/player-quotes.service";

const controller = new PlayerQuotesController(
  new PlayerQuotesService(new PlayerRepository(), new ValuationRepository()),
);

interface PlayerQuotesRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: PlayerQuotesRouteContext): Promise<Response> {
  try {
    requireAuth(request);
    const params = await context.params;
    const playerId = parseParams(params).id;
    const date = parseQuery(request).date;
    return Response.json(await controller.getQuotes(playerId, date));
  } catch (error) {
    return toHttpResponse(error);
  }
}

function parseParams(params: unknown) {
  const result = playerQuotesParamsSchema.safeParse(params);

  if (!result.success) {
    throw new BadRequestError("Invalid player id");
  }

  return result.data;
}

function parseQuery(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? undefined;
  const result = playerQuotesQuerySchema.safeParse({ date });

  if (!result.success) {
    throw new BadRequestError("Invalid date");
  }

  return result.data;
}
