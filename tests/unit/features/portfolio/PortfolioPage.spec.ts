import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), dashboard: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/frontend/context/AuthContext", () => ({ useAuth: mocks.auth }));
vi.mock("@/frontend/features/portfolio/hooks/usePortfolioDashboard", () => ({ usePortfolioDashboard: mocks.dashboard }));
import PortfolioPage from "@/app/portfolio/page";

const snapshot = { creditBalance: 100, items: [{
  playerId: "a", quantity: 2, averagePurchasePrice: 5, currentQuoteValue: 7, currentValue: 14, unrealizedPnl: 4,
}] };
const render = () => renderToStaticMarkup(createElement(PortfolioPage));

describe("portfolio page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockReturnValue({ isHydrated: true, token: "token", user: { role: "INVESTOR" }, logout: vi.fn() });
    mocks.dashboard.mockReturnValue({ token: "token", snapshot, names: { a: "Jugador A" }, phase: "content", error: null, retry: vi.fn() });
  });

  it("shows the own snapshot in summary, positions, and charts", () => {
    const html = render();
    expect(mocks.dashboard).toHaveBeenCalledWith("token", expect.any(Function));
    expect(html).toContain("Mi portfolio");
    expect(html).toContain("114 créditos");
    expect(html).toContain("Jugador A");
    expect(html).not.toContain("Evolución del token");
    expect(html).not.toContain("Valor de cada jugador");
    expect(html).toContain("Resultado no realizado por jugador");
  });

  it("shows an empty portfolio with zero holdings and the existing balance", () => {
    mocks.dashboard.mockReturnValue({ token: "token", snapshot: { creditBalance: 25, items: [] }, names: {}, phase: "empty", error: null, retry: vi.fn() });
    const html = render();
    expect(html).toContain("No tenés posiciones");
    expect(html).toContain("25 créditos");
    expect(html).toContain("0 créditos");
  });

  it("hides all figures on initial failure and after logout", () => {
    mocks.dashboard.mockReturnValue({ token: "token", snapshot: null, names: {}, phase: "initial-error", error: "Offline", retry: vi.fn() });
    expect(render()).toContain("Reintentar");
    expect(render()).not.toContain("100 créditos");
    mocks.auth.mockReturnValue({ isHydrated: true, token: null, user: null, logout: vi.fn() });
    expect(render()).toBe("");
  });

  it("keeps prior figures with a stale warning and retry after refresh failure", () => {
    mocks.dashboard.mockReturnValue({ token: "token", snapshot, names: {}, phase: "stale-error", error: "Offline", retry: vi.fn() });
    const html = render();
    expect(html).toContain("desactualizadas");
    expect(html).toContain("Reintentar");
    expect(html).toContain("114 créditos");
  });
});
