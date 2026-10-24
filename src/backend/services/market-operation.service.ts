import type { AuthTokenPayload } from "@/backend/utils/jwt";
import type { MarketOperationRequest } from "@/backend/schemas/market-operation.schema";
import { MarketRepository } from "@/backend/repositories/market.repository";
import { MarketTrade, type MarketTradeRequest } from "@/backend/models/MarketTrade";
import type { MarketOperation } from "@/backend/models/MarketOperation";
import { TokenHolding } from "@/backend/models/TokenHolding";

export interface MarketTradeResult {
  operation: MarketOperation;
  creditBalance: number;
  holding: TokenHolding;
}

export class MarketOperationService {
  constructor(
    private readonly marketRepository = new MarketRepository(),
    private readonly marketTrade = new MarketTrade()
  ) {}

  buy(auth: AuthTokenPayload, input: MarketOperationRequest, correlationId?: string) {
    return this.trade("BUY", auth, input, correlationId);
  }

  sell(auth: AuthTokenPayload, input: MarketOperationRequest, correlationId?: string) {
    return this.trade("SELL", auth, input, correlationId);
  }

  private async trade(
    type: MarketTradeRequest["type"],
    auth: AuthTokenPayload,
    input: MarketOperationRequest,
    correlationId?: string,
  ): Promise<MarketTradeResult> {
    const request: MarketTradeRequest = {
      type,
      investorId: auth.sub,
      playerId: input.playerId,
      quantity: input.quantity,
      correlationId,
    };

    const result = await this.marketRepository.executeTrade(request, (state) => (
      request.type === "BUY"
        ? this.marketTrade.buy(request, state)
        : this.marketTrade.sell(request, state)
    ));

    return {
      operation: result.outcome.operation,
      creditBalance: result.creditBalance,
      holding: result.outcome.investorHolding,
    };
  }
}
