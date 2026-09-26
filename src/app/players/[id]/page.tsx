"use client";

import Link from "next/link";
import { ChartNoAxesColumnIncreasing, ChartNoAxesCombined } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PageContainer from "@/components/ui/PageContainer/PageContainer";
import { useAuth } from "@/context/AuthContext";
import PlayerInformation from "@/features/profile/components/PlayerInformation/PlayerInformation";
import PlayerProfileHeader from "@/features/profile/components/PlayerProfileHeader/PlayerProfileHeader";
import PlayerStatSection from "@/features/profile/components/PlayerStatSection/PlayerStatSection";
import { detailedStatistics, summaryStatistics } from "@/features/profile/utils/player-profile";
import { usePlayerProfile } from "@/features/profile/hooks/usePlayerProfile";
import styles from "./PlayerProfilePage.module.scss";

export default function PlayerProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { isAuthenticated, isHydrated, token, logout } = useAuth();
  const playerId = params.id;

  const handleUnauthorized = useCallback(() => {
    logout();
    router.replace("/login");
  }, [logout, router]);

  const { player, isLoading, error } = usePlayerProfile(
    isHydrated && isAuthenticated ? token : null,
    playerId,
    handleUnauthorized,
  );

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isHydrated, router]);

  if (!isHydrated || !isAuthenticated) {
    return null;
  }

  const showLoadingState = isLoading;
  const showErrorState = Boolean(error);
  const showPlayerProfile = !isLoading && !error && Boolean(player);

  return (
    <PageContainer className={styles.page}>
      <div className={styles.content}>
        {showLoadingState && <p className={styles.state}>Cargando perfil...</p>}
        {showErrorState && (
          <section className={styles.state} role="alert">
            <p>{error}</p>
            <Link href="/players">Volver a jugadores</Link>
          </section>
        )}
        {showPlayerProfile && player && (
          <>
            <PlayerProfileHeader player={player} />
            <div className={styles.overview}>
              <PlayerStatSection
                title="Rendimiento"
                icon={<ChartNoAxesCombined size={18} />}
                statistics={player.statistics}
                items={summaryStatistics}
              />
              <PlayerInformation player={player} />
            </div>
            <PlayerStatSection
              title="Estadísticas detalladas"
              icon={<ChartNoAxesColumnIncreasing size={18} />}
              statistics={player.statistics}
              items={detailedStatistics}
            />
          </>
        )}
      </div>
    </PageContainer>
  );
}
