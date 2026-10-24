import type { AuthTokenPayload } from "@/backend/utils/jwt";
import type { MarketOperationRow } from "@/backend/db/schema";
import type {
  MarketOperationHistoryQuery,
  MarketOperationRequest,
} from "@/backend/schemas/market-operation.schema";
import { MarketRepository } from "@/backend/repositories/market.repository";
import { MarketTrade, type MarketTradeRequest } from "@/backend/models/MarketTrade";
import type { MarketOperation } from "@/backend/models/MarketOperation";
import { TokenHolding } from "@/backend/models/TokenHolding";
import { ForbiddenError } from "@/backend/errors/http.error";

export interface MarketOperationHistoryItem {
  id: string;
  type: string;
  playerId: string;
  quantity: number;
  quoteId: string;
  quoteValue: number;
  total: number;
  unit: string;
  createdAt: Date;
  correlationId: string | null;
}

export interface MarketOperationHistoryResult {
  items: MarketOperationHistoryItem[];
  limit: number;
  offset: number;
  hasMore: boolean;
}

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

  async getHistory(auth: AuthTokenPayload, userId: string, query: MarketOperationHistoryQuery): Promise<MarketOperationHistoryResult> {
    if (auth.sub !== userId) throw new ForbiddenError();

    const page = await this.marketRepository.findOperationsByInvestorId(
      userId,
      query.limit,
      query.offset,
    );

    return {
      items: page.rows.map(toHistoryItem),
      limit: query.limit,
      offset: query.offset,
      hasMore: page.hasMore,
    };
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

function toHistoryItem(row: MarketOperationRow): MarketOperationHistoryItem {
  return {
    id: row.id,
    type: row.type,
    playerId: row.playerId,
    quantity: row.quantity,
    quoteId: row.quoteId,
    quoteValue: Number(row.quoteValue),
    total: Number(row.total),
    unit: row.unit,
    createdAt: row.createdAt,
    correlationId: row.correlationId,
  };
}
