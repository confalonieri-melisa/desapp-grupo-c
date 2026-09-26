import { PlayerController } from "@/backend/controllers/player.controller";
import { toHttpResponse } from "@/backend/errors/to-http-response";
import { requireAuth } from "@/backend/middlewares/auth.middleware";
import { PlayerRepository } from "@/backend/repositories/player.repository";
import { playerParamsSchema } from "@/backend/schemas/player.schema";
import { PlayerService } from "@/backend/services/player.service";
import { validate } from "@/backend/utils/validate";

const controller = new PlayerController(
  new PlayerService(new PlayerRepository()),
);

interface PlayerRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: PlayerRouteContext): Promise<Response> {
  try {
    requireAuth(request);
    const { id } = validate(playerParamsSchema, await context.params);

    return Response.json(await controller.getById(id));
  } catch (error) {
    return toHttpResponse(error);
  }
}
