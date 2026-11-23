import { P2POfferController } from "@/backend/controllers/p2p-offer.controller";
import { toHttpResponse } from "@/backend/errors/to-http-response";
import { requireAuth } from "@/backend/middlewares/auth.middleware";
import { createP2POfferSchema, p2pOfferQuerySchema } from "@/backend/schemas/p2p-offer.schema";
import { requestObservation } from "@/backend/observability/request-observation";

const controller = new P2POfferController();

export async function POST(request: Request): Promise<Response> {
  return requestObservation.observe(request, "/api/p2p/offers", async () => {
    try {
      const auth = requireAuth(request);
      const input = createP2POfferSchema.parse(await request.json());
      return Response.json(await controller.publishOffer(auth, input), { status: 201 });
    } catch (error) {
      return toHttpResponse(error);
    }
  });
}

export async function GET(request: Request): Promise<Response> {
  return requestObservation.observe(request, "/api/p2p/offers", async () => {
    try {
      requireAuth(request);
      const query = p2pOfferQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
      return Response.json(await controller.findAvailableOffers(query));
    } catch (error) {
      return toHttpResponse(error);
    }
  });
}
