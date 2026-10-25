import { describe, expect, it, vi } from "vitest";
import { PortfolioController } from "@/backend/controllers/portfolio.controller";

describe("PortfolioController", () => {
  it("delegates the portfolio query using the authenticated token", async () => {
    const service = {
      getPortfolio: vi.fn().mockResolvedValue({
        creditBalance: 1000,
        items: [],
      }),
    };
    const controller = new PortfolioController(service as never);
    const auth = { sub: "investor-id", email: "investor@example.com", role: "INVESTOR" } as const;

    await expect(controller.getPortfolio(auth)).resolves.toEqual({
      creditBalance: 1000,
      items: [],
    });
    expect(service.getPortfolio).toHaveBeenCalledWith(auth);
  });
});
