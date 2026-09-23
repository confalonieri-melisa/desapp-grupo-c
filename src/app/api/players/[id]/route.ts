import { PlayerController } from "@/controllers/player.controller";
import { toHttpResponse } from "@/errors/to-http-response";
import { requireAuth } from "@/middlewares/auth.middleware";
import { PlayerRepository } from "@/repositories/player.repository";
import { PlayerService } from "@/services/player.service";

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

    return Response.json(await controller.getById(id));
  } catch (error) {
    return toHttpResponse(error);
  }
}
