import type { AuthTokenPayload } from "@/backend/utils/jwt";
import { NotFoundError } from "@/backend/errors/http.error";
import { PortfolioRepository } from "@/backend/repositories/portfolio.repository";
import { UserRepository } from "@/backend/repositories/user.repository";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";

export interface PortfolioItem {
  playerId: string;
  quantity: number;
  averagePurchasePrice: number;
  currentQuoteValue: number | null;
  currentValue: number | null;
  unrealizedPnl: number | null;
}

export interface PortfolioSnapshot {
  creditBalance: number;
  items: PortfolioItem[];
}

export class PortfolioService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly portfolioRepository = new PortfolioRepository(),
    private readonly valuationRepository = new ValuationRepository()
  ) {}

  async getPortfolio(auth: AuthTokenPayload): Promise<PortfolioSnapshot> {
    const user = await this.userRepository.findById(auth.sub);
    if (!user) throw new NotFoundError("Investor not found");

    const positions = await this.portfolioRepository.findPositionsByUserId(auth.sub);
    const items = await Promise.all(positions.map((position) => this.toPortfolioItem(position)));
    return { creditBalance: user.creditBalance, items };
  }

  private async toPortfolioItem(position: Awaited<ReturnType<PortfolioRepository["findPositionsByUserId"]>>[number]): Promise<PortfolioItem> {
    const quote = await this.valuationRepository.findLatestForPlayer(position.playerId);
    const currentQuoteValue = quote?.quoteValue ?? null;

    return {
      playerId: position.playerId,
      quantity: position.quantity,
      averagePurchasePrice: position.averagePurchasePrice,
      currentQuoteValue,
      currentValue: currentQuoteValue === null ? null : position.currentValueAt(currentQuoteValue),
      unrealizedPnl: currentQuoteValue === null ? null : position.unrealizedPnlAt(currentQuoteValue),
    };
  }
}
