"use client";

import Link from "next/link";
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

  return (
    <PageContainer className={styles.page}>
      <div className={styles.content}>
        {isLoading && <p className={styles.state}>Cargando perfil...</p>}
        {error && (
          <section className={styles.state} role="alert">
            <p>{error}</p>
            <Link href="/players">Volver a jugadores</Link>
          </section>
        )}
        {!isLoading && !error && player && (
          <>
            <PlayerProfileHeader player={player} />
            <div className={styles.overview}>
              <PlayerStatSection
                title="Rendimiento"
                statistics={player.statistics}
                items={summaryStatistics}
              />
              <PlayerInformation player={player} />
            </div>
            <PlayerStatSection
              title="Estadísticas detalladas"
              statistics={player.statistics}
              items={detailedStatistics}
            />
          </>
        )}
      </div>
    </PageContainer>
  );
}
