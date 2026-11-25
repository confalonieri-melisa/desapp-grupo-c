import { FootballDataAdapter } from "@/backend/adapters/football-data.adapter";
import { CompetitionContextController } from "@/backend/controllers/competition-context.controller";
import { CompetitionContextRepository } from "@/backend/repositories/competition-context.repository";
import { CompetitionContextService } from "@/backend/services/competition-context.service";
import { toHttpResponse } from "@/backend/errors/to-http-response";
import { requireSuperuser } from "@/backend/middlewares/auth.middleware";
import { requestObservation } from "@/backend/observability/request-observation";

const controller = new CompetitionContextController(
  new CompetitionContextService(new FootballDataAdapter(), new CompetitionContextRepository()),
);

export async function POST(request: Request): Promise<Response> {
  return requestObservation.observe(request, "/api/competition-context/updates", async () => {
    try {
      const auth = requireSuperuser(request);
      return Response.json(await controller.update(await request.json(), auth.sub));
    } catch (error) {
      return toHttpResponse(error);
    }
  });
}
