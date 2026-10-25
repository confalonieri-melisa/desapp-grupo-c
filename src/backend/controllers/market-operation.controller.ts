import type { MarketOperationService } from "@/backend/services/market-operation.service";
import type { AuthTokenPayload } from "@/backend/utils/jwt";
import type { MarketOperationRequest } from "@/backend/schemas/market-operation.schema";

export class MarketOperationController {
  constructor(private readonly service: MarketOperationService) {}

  async buy(auth: AuthTokenPayload, input: MarketOperationRequest, correlationId?: string) {
    return toResponse(await this.service.buy(auth, input, correlationId));
  }

  async sell(auth: AuthTokenPayload, input: MarketOperationRequest, correlationId?: string) {
    return toResponse(await this.service.sell(auth, input, correlationId));
  }
}

function toResponse(result: Awaited<ReturnType<MarketOperationService["buy"]>>) {
  return {
    operation: {
      id: result.operation.id,
      type: result.operation.type,
      userId: result.operation.investorId,
      playerId: result.operation.playerId,
      quantity: result.operation.quantity,
      quoteValue: result.operation.quoteValue,
      total: result.operation.total,
      createdAt: result.operation.createdAt,
    },
    account: { creditBalance: result.creditBalance },
    holding: {
      quantity: result.holding.quantity,
      averagePurchasePrice: result.holding.averagePurchasePrice,
    },
  };
}
