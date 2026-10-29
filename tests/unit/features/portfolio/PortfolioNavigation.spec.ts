import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), pathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: mocks.pathname, useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/frontend/context/AuthContext", () => ({ useAuth: mocks.auth }));
import GlobalNav from "@/frontend/components/GlobalNav/GlobalNav";

describe("portfolio navigation", () => {
  beforeEach(() => {
    mocks.pathname.mockReturnValue("/portfolio");
    mocks.auth.mockReturnValue({ token: "token", user: { role: "INVESTOR" }, isAuthenticated: true, isHydrated: true, logout: vi.fn() });
  });

  it("retains transaction history alongside the investor portfolio link", () => {
    const html = renderToStaticMarkup(createElement(GlobalNav));
    expect(html).toContain("Jugadores");
    expect(html).toContain("Mi historial");
    expect(html).toContain("Mi portfolio");
    expect(html).toContain('href="/transactions"');
    expect(html).toContain('href="/portfolio"');
  });

  it("does not offer the investor portfolio link to other roles", () => {
    mocks.auth.mockReturnValue({ token: "token", user: { role: "ADMIN" }, isAuthenticated: true, isHydrated: true, logout: vi.fn() });
    const html = renderToStaticMarkup(createElement(GlobalNav));
    expect(html).toContain("Mi historial");
    expect(html).not.toContain("Mi portfolio");
  });
});
