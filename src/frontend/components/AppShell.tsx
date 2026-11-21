"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/frontend/context/AuthContext";
import GlobalNav from "@/frontend/components/GlobalNav/GlobalNav";

const AUTH_ROUTES = new Set(["/login", "/register"]);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isHydrated } = useAuth();

  const shouldShowNavigation = isHydrated && isAuthenticated && !AUTH_ROUTES.has(pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      {shouldShowNavigation && <GlobalNav />}
      {children}
    </>
  );
}
