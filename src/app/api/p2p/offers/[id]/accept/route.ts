import { P2POfferController } from "@/backend/controllers/p2p-offer.controller";
import { toHttpResponse } from "@/backend/errors/to-http-response";
import { requireAuth } from "@/backend/middlewares/auth.middleware";
import { p2pOfferIdSchema } from "@/backend/schemas/p2p-offer.schema";
import { requestObservation } from "@/backend/observability/request-observation";

const controller = new P2POfferController();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  return requestObservation.observe(request, "/api/p2p/offers/:id/accept", async () => {
    const correlationId = request.headers.get("x-correlation-id") ?? undefined;
    const idempotencyKey = request.headers.get("Idempotency-Key")!;

    try {
      const auth = requireAuth(request);
      const { id } = p2pOfferIdSchema.parse(await context.params);

      return Response.json(
        await controller.completeOffer(auth, id, idempotencyKey, correlationId),
        { status: 201 },
      );
    } catch (error) {
      return toHttpResponse(error);
    }
  });
}
