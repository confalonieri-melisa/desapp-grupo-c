"use client";

import Link from "next/link";
import {ChartNoAxesColumnIncreasing, ChartNoAxesCombined} from "lucide-react";
import {useCallback, useEffect} from "react";
import {useParams, useRouter} from "next/navigation";
import PageContainer from "@/frontend/components/ui/PageContainer/PageContainer";
import {useAuth} from "@/frontend/context/AuthContext";
import QuoteTrendCard from "@/frontend/features/profile/components/QuoteTrend/QuoteTrendCard";
import PlayerQuotesSection from "@/frontend/features/profile/components/PlayerQuotesSection/PlayerQuotesSection";
import PlayerTradingSection from "@/frontend/features/profile/components/PlayerTradingSection/PlayerTradingSection";
import PlayerProfileHeader from "@/frontend/features/profile/components/PlayerProfileHeader/PlayerProfileHeader";
import PlayerStatSection from "@/frontend/features/profile/components/PlayerStatSection/PlayerStatSection";
import {detailedStatistics, summaryStatistics} from "@/frontend/features/profile/utils/player-profile";
import {usePlayerProfile} from "@/frontend/features/profile/hooks/usePlayerProfile";
import {usePlayerQuotes} from "@/frontend/features/profile/hooks/usePlayerQuotes";
import {usePlayerTrading} from "@/frontend/features/profile/hooks/usePlayerTrading";
import styles from "./PlayerProfilePage.module.scss";

export default function PlayerProfilePage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const {isAuthenticated, isHydrated, token, user, logout} = useAuth();
    const playerId = params.id;

    const handleUnauthorized = useCallback(() => {
        logout();
        router.replace("/login");
    }, [logout, router]);

    const {player, isLoading, error} = usePlayerProfile(
        isHydrated && isAuthenticated ? token : null,
        playerId,
        handleUnauthorized,
    );
    const confirmedPlayer = isHydrated && isAuthenticated && token && !isLoading && !error && player?.id === playerId ? player : null;
    const quotes = usePlayerQuotes(confirmedPlayer ? token : null, confirmedPlayer?.id ?? "", handleUnauthorized);
    const trading = usePlayerTrading(confirmedPlayer ? token : null, confirmedPlayer?.id ?? "", handleUnauthorized);

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
    const showPlayerProfile = Boolean(confirmedPlayer);

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
                        <PlayerProfileHeader player={player}/>
                        <div className={styles.overview}>
                            <PlayerStatSection
                                title="Rendimiento"
                                icon={<ChartNoAxesCombined size={18}/>}
                                statistics={player.statistics}
                                items={summaryStatistics}
                            />
                            <QuoteTrendCard quotes={quotes} playerName={player.name}/>
                        </div>
                        <PlayerStatSection
                            title="Estadísticas detalladas"
                            icon={<ChartNoAxesColumnIncreasing size={18}/>}
                            statistics={player.statistics}
                            items={detailedStatistics}
                        />
                        <PlayerQuotesSection quotes={quotes}/>
                        <PlayerTradingSection playerId={player.id} playerName={player.name} role={user?.role ?? ""}
                                              quotes={quotes} trading={trading}/>
                    </>
                )}
            </div>
        </PageContainer>
    );
}
