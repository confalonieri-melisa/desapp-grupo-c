import { PlayerController } from "@/backend/controllers/player.controller";
import { toHttpResponse } from "@/backend/errors/to-http-response";
import { requireAuth } from "@/backend/middlewares/auth.middleware";
import { PlayerRepository } from "@/backend/repositories/player.repository";
import { PlayerService } from "@/backend/services/player.service";
import { requestObservation } from "@/backend/observability/request-observation";

const controller = new PlayerController(new PlayerService(new PlayerRepository()));

export async function GET(request: Request): Promise<Response> {
  return requestObservation.observe(request, "/api/players", async () => {
    try {
      requireAuth(request);

      const url = new URL(request.url);
      const query = Object.fromEntries(url.searchParams.entries());
      return Response.json(await controller.getPlayers(query));
    } catch (error) {
      return toHttpResponse(error);
    }
  });
}
