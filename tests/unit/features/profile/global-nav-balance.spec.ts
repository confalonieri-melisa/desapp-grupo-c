import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createHookHarness, deferred, flushPromises } from "./hook-harness";
import type { PortfolioSnapshot } from "@/frontend/services/client/player-trading.service";
import { publishPortfolioUpdate } from "@/frontend/services/client/portfolio-events";

const mocks = vi.hoisted(() => ({ getPortfolio: vi.fn(), logout: vi.fn(), replace: vi.fn(), token: "token" as string | null }));
let harness = createHookHarness();

vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState: <T>(initial: T | (() => T)) => harness.useState(initial),
  useEffect: (effect: () => void | (() => void), deps?: unknown[]) => harness.useEffect(effect, deps),
  useCallback: (callback: unknown) => callback,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/players", useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/frontend/context/AuthContext", () => ({ useAuth: () => ({
  token: mocks.token, logout: mocks.logout, isAuthenticated: !!mocks.token, isHydrated: true,
}) }));
vi.mock("@/frontend/services/client/player-trading.service", () => ({ getPortfolio: mocks.getPortfolio }));

import GlobalNav from "@/frontend/components/GlobalNav/GlobalNav";

function balanceText(): string {
  const tree = harness.render(GlobalNav);
  const findStrong = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(findStrong).find((value) => value !== undefined);
    if (!node || typeof node !== "object" || !("props" in node)) return undefined;
    const element = node as { type?: unknown; props: { children?: unknown } };
    return element.type === "strong" ? element.props.children : findStrong(element.props.children);
  };
  return String(findStrong(tree));
}

describe("global navigation balance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.token = "token";
    harness = createHookHarness();
    vi.stubGlobal("window", new EventTarget());
  });
  afterEach(() => {
    harness.cleanup();
    vi.unstubAllGlobals();
  });

  it("does not restore an old balance when a post trade refresh fails", async () => {
    mocks.getPortfolio.mockResolvedValueOnce({ creditBalance: 100, items: [] });
    balanceText(); harness.commit(); await flushPromises();
    expect(balanceText()).toBe("100 créditos");

    publishPortfolioUpdate({ token: "token", status: "loading", snapshot: null });
    expect(balanceText()).toBe("Cargando…");

    publishPortfolioUpdate({ token: "token", status: "error", snapshot: null });
    expect(balanceText()).toBe("No disponible");
    expect(mocks.getPortfolio).toHaveBeenCalledOnce();
  });

  it("uses the trading refresh result and ignores an older navbar response", async () => {
    const initial = deferred<PortfolioSnapshot>();
    mocks.getPortfolio.mockReturnValueOnce(initial.promise);
    balanceText(); harness.commit();
    publishPortfolioUpdate({ token: "token", status: "loading", snapshot: null });

    initial.resolve({ creditBalance: 100, items: [] }); await flushPromises();
    expect(balanceText()).toBe("Cargando…");
    publishPortfolioUpdate({ token: "token", status: "success", snapshot: { creditBalance: 80, items: [] } });
    expect(balanceText()).toBe("80 créditos");
    expect(mocks.getPortfolio).toHaveBeenCalledOnce();
  });

  it("does not show another session's balance or accept its update", async () => {
    mocks.getPortfolio.mockResolvedValueOnce({ creditBalance: 100, items: [] });
    balanceText(); harness.commit(); await flushPromises();
    expect(balanceText()).toBe("100 créditos");

    mocks.token = "other-token";
    expect(balanceText()).toBe("Cargando…");
    mocks.getPortfolio.mockReturnValueOnce(deferred<PortfolioSnapshot>().promise);
    harness.commit();
    publishPortfolioUpdate({ token: "token", status: "success", snapshot: { creditBalance: 100, items: [] } });
    expect(balanceText()).toBe("Cargando…");
  });
});
