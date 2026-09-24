import { PlayerController } from "@/controllers/player.controller";
import { toHttpResponse } from "@/errors/to-http-response";
import { requireAuth } from "@/middlewares/auth.middleware";
import { PlayerRepository } from "@/repositories/player.repository";
import { playerIdSchema } from "@/schemas/player.schema";
import { PlayerService } from "@/services/player.service";
import { validate } from "@/utils/validate";

const controller = new PlayerController(
  new PlayerService(new PlayerRepository()),
);

interface PlayerRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: PlayerRouteContext): Promise<Response> {
  try {
    requireAuth(request);
    const { id } = await context.params;
    validate(playerIdSchema, id);

    return Response.json(await controller.getById(id));
  } catch (error) {
    return toHttpResponse(error);
  }
}
