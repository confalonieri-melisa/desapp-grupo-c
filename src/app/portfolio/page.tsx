"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "@/frontend/components/ui/PageContainer/PageContainer";
import { useAuth } from "@/frontend/context/AuthContext";
import { usePortfolioDashboard } from "@/frontend/features/portfolio/hooks/usePortfolioDashboard";
import { PortfolioSummary } from "@/frontend/features/portfolio/components/PortfolioSummary";
import { PortfolioPositions } from "@/frontend/features/portfolio/components/PortfolioPositions";
import { PortfolioPnlChart } from "@/frontend/features/portfolio/components/PortfolioPnlChart";
import styles from "./PortfolioPage.module.scss";

export default function PortfolioPage() {
  const router = useRouter();
  const { token, user, isHydrated, logout } = useAuth();
  const unauthorized = useCallback(() => { logout(); router.replace("/login"); }, [logout, router]);
  const authorizedToken = isHydrated && user?.role === "INVESTOR" ? token : null;
  const dashboard = usePortfolioDashboard(authorizedToken, unauthorized);

  useEffect(() => {
    if (isHydrated && !token) router.replace("/login");
    else if (isHydrated && user?.role !== "INVESTOR") router.replace("/players");
  }, [isHydrated, token, user?.role, router]);

  if (!authorizedToken) return null;
  const { snapshot, names, phase, error, retry } = dashboard;
  return <PageContainer className={styles.page}>
    <div className={styles.content}>
      <header className={styles.header}><p>Tu cartera actual</p><h1>Mi portfolio</h1></header>
      {phase === "initial-loading" && <p role="status">Cargando portfolio…</p>}
      {phase === "initial-error" && <div className={styles.notice} role="alert"><p>{error}</p><button type="button" onClick={retry}>Reintentar</button></div>}
      {snapshot && <>
        {phase === "refreshing" && <div className={styles.notice} role="status">Actualizando portfolio. Las cifras anteriores pueden estar desactualizadas.</div>}
        {phase === "stale-error" && <div className={styles.notice} role="alert"><p>No se pudo actualizar el portfolio. Las cifras anteriores están desactualizadas. {error}</p><button type="button" onClick={retry}>Reintentar</button></div>}
        <PortfolioSummary snapshot={snapshot} />
        <PortfolioPositions snapshot={snapshot} names={names} />
        <div className={styles.charts}>
          <PortfolioPnlChart snapshot={snapshot} names={names} />
        </div>
      </>}
    </div>
  </PageContainer>;
}
