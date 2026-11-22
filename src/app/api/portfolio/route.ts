import { PortfolioController } from "@/backend/controllers/portfolio.controller";
import { toHttpResponse } from "@/backend/errors/to-http-response";
import { requireAuth } from "@/backend/middlewares/auth.middleware";
import { PortfolioService } from "@/backend/services/portfolio.service";
import { requestObservation } from "@/backend/observability/request-observation";

const controller = new PortfolioController(new PortfolioService());

export async function GET(request: Request): Promise<Response> {
  return requestObservation.observe(request, "/api/portfolio", async () => {
    try {
      const auth = requireAuth(request);
      return Response.json(await controller.getPortfolio(auth));
    } catch (error) {
      return toHttpResponse(error);
    }
  });
}
