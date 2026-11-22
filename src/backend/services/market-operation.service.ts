import type { MarketOperationRow } from "@/backend/db/schema";
import { AuthorizationError } from "@/backend/errors/application.error";
import { MarketTrade, type MarketTradeRequest } from "@/backend/models/MarketTrade";
import type { TokenPurchaseReceipt } from "@/backend/models/TokenPurchaseReceipt";
import { MarketRepository } from "@/backend/repositories/market.repository";
import type {
  MarketOperationHistoryQuery,
  MarketOperationRequest,
} from "@/backend/schemas/market-operation.schema";
import type { AuthTokenPayload } from "@/backend/utils/jwt";

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

export class MarketOperationService {
  constructor(
    private readonly marketRepository = new MarketRepository(),
    private readonly marketTrade = new MarketTrade(),
  ) {}

  async buy(auth: AuthTokenPayload, input: MarketOperationRequest, idempotencyKey: string, correlationId?: string): Promise<TokenPurchaseReceipt> {
    const request: MarketTradeRequest = {
      investorId: auth.sub,
      playerId: input.playerId,
      quantity: input.quantity,
      correlationId,
    };
    return this.marketRepository.executeTokenPurchase(
      request,
      (state) => this.marketTrade.buyFromPool(request, state),
      { key: idempotencyKey, playerId: input.playerId, quantity: input.quantity },
    );
  }

  async getHistory(
    auth: AuthTokenPayload,
    userId: string,
    query: MarketOperationHistoryQuery,
  ): Promise<MarketOperationHistoryResult> {
    if (auth.sub !== userId) throw new AuthorizationError("Forbidden");

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
