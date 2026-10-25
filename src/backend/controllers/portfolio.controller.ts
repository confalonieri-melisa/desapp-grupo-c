import type { PortfolioService } from "@/backend/services/portfolio.service";
import type { AuthTokenPayload } from "@/backend/utils/jwt";

export class PortfolioController {
  constructor(private readonly service: PortfolioService) {}

  getPortfolio(auth: AuthTokenPayload) {
    return this.service.getPortfolio(auth);
  }
}
