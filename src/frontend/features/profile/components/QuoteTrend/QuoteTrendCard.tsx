import type { usePlayerQuotes } from "../../hooks/usePlayerQuotes";
import { TrendingUp } from "lucide-react";
import QuoteTrend from "./QuoteTrend";
import styles from "./QuoteTrend.module.scss";

export default function QuoteTrendCard({ quotes, playerName }: { quotes: ReturnType<typeof usePlayerQuotes>; playerName: string }) {
  if (quotes.expired) return null;
  return <section className={styles.panel} aria-labelledby="player-trend-title">
    <h2 id="player-trend-title"><TrendingUp size={18} aria-hidden="true" />Valor del jugador</h2>
    {!quotes.playerError && (quotes.history.status === "idle" || quotes.history.status === "loading") && <p className={styles.state} role="status">Cargando evolución…</p>}
    {quotes.playerError && <p className={styles.state}>Evolución no disponible para este jugador.</p>}
    {quotes.history.status === "error" && <div className={styles.state} role="alert"><p>No se pudo cargar la evolución.</p><button type="button" onClick={quotes.retryHistory}>Reintentar</button></div>}
    {(quotes.history.status === "success" || quotes.history.status === "empty") && <QuoteTrend items={quotes.history.items} playerName={playerName} />}
  </section>;
}
