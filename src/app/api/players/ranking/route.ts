import { PlayerRankingController } from "@/backend/controllers/player-ranking.controller";
import { toHttpResponse } from "@/backend/errors/to-http-response";
import { requireAuth } from "@/backend/middlewares/auth.middleware";
import { PlayerRankingService } from "@/backend/services/player-ranking.service";

const controller = new PlayerRankingController(new PlayerRankingService());

export async function GET(request: Request): Promise<Response> {
  try {
    requireAuth(request);
    const query = Object.fromEntries(new URL(request.url).searchParams.entries());
    return Response.json(await controller.getRanking(query));
  } catch (error) {
    return toHttpResponse(error);
  }
}
