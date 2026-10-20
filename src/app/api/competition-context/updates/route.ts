import { CompetitionContextController } from "@/backend/controllers/competition-context.controller";
import { toHttpResponse } from "@/backend/errors/to-http-response";
import { ForbiddenError } from "@/backend/errors/http.error";
import { requireAuth } from "@/backend/middlewares/auth.middleware";
import { UserRole } from "@/backend/models/enums";

const controller = new CompetitionContextController();

export async function POST(request: Request): Promise<Response> {
  try {
    const auth = requireAuth(request);
    if (auth.role !== UserRole.SUPERUSER) throw new ForbiddenError();
    return Response.json(await controller.update(await request.json(), auth.sub));
  } catch (error) {
    return toHttpResponse(error);
  }
}
