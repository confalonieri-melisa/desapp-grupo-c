import type { PortfolioSnapshot } from "./player-trading.service";

export const PORTFOLIO_UPDATED_EVENT = "portfolio-updated";

export type PortfolioUpdate = {
  token: string;
  status: "loading" | "success" | "error";
  snapshot: PortfolioSnapshot | null;
};

export function publishPortfolioUpdate(update: PortfolioUpdate): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<PortfolioUpdate>(PORTFOLIO_UPDATED_EVENT, { detail: update }));
  }
}
