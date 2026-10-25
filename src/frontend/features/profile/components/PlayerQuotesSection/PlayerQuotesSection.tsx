"use client";

import Link from "next/link";
import { usePlayerQuotes } from "../../hooks/usePlayerQuotes";
import QuoteSummary from "../QuoteSummary/QuoteSummary";
import QuoteHistory from "../QuoteHistory/QuoteHistory";
import QuoteDateQuery from "../QuoteDateQuery/QuoteDateQuery";
import styles from "./PlayerQuotesSection.module.scss";

export default function PlayerQuotesSection({ token, playerId, onUnauthorized }: {
  token: string; playerId: string; onUnauthorized: () => void;
}) {
  const quotes = usePlayerQuotes(token, playerId, onUnauthorized);
  if (quotes.expired) return null;
  if (quotes.playerError) return <section className={styles.section} role="alert"><p>{quotes.playerError}</p><Link href="/players">Volver al catálogo</Link></section>;
  return <section className={styles.section} aria-label="Cotizaciones">
    <h2>Cotizaciones</h2>
    <h3>Cotización actual</h3>
    <div role="status">
      {quotes.history.status === "loading" && <p>Cargando cotizaciones…</p>}
      {quotes.history.status === "empty" && <p>No hay cotización disponible</p>}
    </div>
    {quotes.history.status === "error" && <div role="alert"><p>{quotes.history.error}</p><button type="button" onClick={quotes.retryHistory}>Reintentar historial</button></div>}
    {quotes.current && <div key={`current:${quotes.history.generation}`}><QuoteSummary quote={quotes.current} context="cotización actual" /></div>}
    {(quotes.history.status === "success" || quotes.history.status === "empty") && <QuoteHistory items={quotes.history.items} generation={quotes.history.generation} />}
    <QuoteDateQuery quotes={quotes} />
  </section>;
}
