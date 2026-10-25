import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), params: vi.fn(), replace: vi.fn(), profile: vi.fn(), quotes: vi.fn(), trading: vi.fn(),
}));

vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useCallback: (callback: unknown) => callback,
  useEffect: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useParams: mocks.params, useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/frontend/context/AuthContext", () => ({ useAuth: mocks.auth }));
vi.mock("@/frontend/features/profile/hooks/usePlayerProfile", () => ({ usePlayerProfile: mocks.profile }));
vi.mock("@/frontend/features/profile/hooks/usePlayerQuotes", () => ({ usePlayerQuotes: mocks.quotes }));
vi.mock("@/frontend/features/profile/hooks/usePlayerTrading", () => ({ usePlayerTrading: mocks.trading }));
vi.mock("@/frontend/features/profile/components/PlayerQuotesSection/PlayerQuotesSection", () => ({ default: function PlayerQuotesSection() {} }));
vi.mock("@/frontend/features/profile/components/PlayerTradingSection/PlayerTradingSection", () => ({ default: function PlayerTradingSection() {} }));
vi.mock("@/frontend/features/profile/components/PlayerProfileHeader/PlayerProfileHeader", () => ({ default: function PlayerProfileHeader() {} }));
vi.mock("@/frontend/features/profile/components/PlayerStatSection/PlayerStatSection", () => ({ default: function PlayerStatSection() {} }));
vi.mock("@/frontend/features/profile/components/PlayerInformation/PlayerInformation", () => ({ default: function PlayerInformation() {} }));
vi.mock("@/frontend/components/ui/PageContainer/PageContainer", () => ({ default: function PageContainer() {} }));

import PlayerProfilePage from "@/app/players/[id]/page";
import PlayerQuotesSection from "@/frontend/features/profile/components/PlayerQuotesSection/PlayerQuotesSection";
import PlayerTradingSection from "@/frontend/features/profile/components/PlayerTradingSection/PlayerTradingSection";

type ElementNode = { type?: unknown; props?: { children?: unknown; [key: string]: unknown } };
function elements(node: unknown): ElementNode[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("type" in node)) return [];
  const element = node as ElementNode;
  return [element, ...elements(element.props?.children)];
}

describe("player profile quote ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.params.mockReturnValue({ id: "player-a" });
    mocks.auth.mockReturnValue({ isAuthenticated: true, isHydrated: true, token: "token-a", user: { role: "INVESTOR" }, logout: vi.fn() });
    mocks.profile.mockReturnValue({ player: { id: "player-a", name: "Jugador A", currentQuote: 999 }, isLoading: false, error: null });
    mocks.quotes.mockReturnValue({ current: { quoteValue: 12 }, history: { status: "success", items: [] } });
    mocks.trading.mockReturnValue({ portfolio: { status: "success", snapshot: { creditBalance: 100, items: [] } }, retryPortfolio: vi.fn() });
  });

  it("reads quotes once for the confirmed player and passes the same result to the section", () => {
    const tree = PlayerProfilePage();
    expect(mocks.quotes).toHaveBeenCalledOnce();
    expect(mocks.quotes).toHaveBeenCalledWith("token-a", "player-a", expect.any(Function));
    const section = elements(tree).find((element) => element.type === PlayerQuotesSection);
    expect(section?.props?.quotes).toBe(mocks.quotes.mock.results[0].value);
    expect(section?.props?.quotes).toHaveProperty("current.quoteValue", 12);
    const tradingSection = elements(tree).find((element) => element.type === PlayerTradingSection);
    expect(mocks.trading).toHaveBeenCalledOnce();
    expect(mocks.trading).toHaveBeenCalledWith("token-a", "player-a", expect.any(Function));
    expect(tradingSection?.props).toMatchObject({ playerId: "player-a", playerName: "Jugador A", role: "INVESTOR" });
    expect(tradingSection?.props?.quotes).toBe(mocks.quotes.mock.results[0].value);
    expect(tradingSection?.props?.trading).toBe(mocks.trading.mock.results[0].value);
  });

  it("calls the hook with empty identity and mounts no quote section until the profile is confirmed", () => {
    mocks.profile.mockReturnValue({ player: null, isLoading: true, error: null });
    const tree = PlayerProfilePage();
    expect(mocks.quotes).toHaveBeenCalledOnce();
    expect(mocks.quotes).toHaveBeenCalledWith(null, "", expect.any(Function));
    expect(mocks.trading).toHaveBeenCalledWith(null, "", expect.any(Function));
    expect(elements(tree).some((element) => element.type === PlayerQuotesSection)).toBe(false);
    expect(elements(tree).some((element) => element.type === PlayerTradingSection)).toBe(false);
  });

  it("does not mount protected sections or read quotes before session hydration", () => {
    mocks.auth.mockReturnValue({ isAuthenticated: false, isHydrated: false, token: null, logout: vi.fn() });
    expect(PlayerProfilePage()).toBeNull();
    expect(mocks.quotes).toHaveBeenCalledWith(null, "", expect.any(Function));
    expect(mocks.quotes).toHaveBeenCalledOnce();
    expect(mocks.trading).toHaveBeenCalledWith(null, "", expect.any(Function));
    expect(elements(PlayerProfilePage()).some((element) => element.type === PlayerTradingSection)).toBe(false);
  });
});
