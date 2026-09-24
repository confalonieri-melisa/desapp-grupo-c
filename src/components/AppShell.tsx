'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import CatalogNav from '@/features/catalog/components/CatalogNav/CatalogNav';

const AUTH_ROUTES = new Set(['/login', '/register']);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isHydrated } = useAuth();

  const shouldShowNavigation = (
    isHydrated
    && isAuthenticated
    && !AUTH_ROUTES.has(pathname)
  );

  return (
    <>
      {shouldShowNavigation && <CatalogNav />}
      {children}
    </>
  );
}
