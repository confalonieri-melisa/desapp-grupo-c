"use client";

import Link from "next/link";
import type { usePlayerQuotes } from "../../hooks/usePlayerQuotes";
import QuoteSummary from "../QuoteSummary/QuoteSummary";
import QuoteHistory from "../QuoteHistory/QuoteHistory";
import QuoteDateQuery from "../QuoteDateQuery/QuoteDateQuery";
import styles from "./PlayerQuotesSection.module.scss";

export default function PlayerQuotesSection({ quotes }: {
  quotes: ReturnType<typeof usePlayerQuotes>;
}) {
  if (quotes.expired) return null;
  if (quotes.playerError) return <section className={styles.section} role="alert"><p>{quotes.playerError}</p><Link href="/players">Volver al catálogo</Link></section>;
  return <section className={styles.section} aria-label="Cotizaciones">
    <div className={styles.sectionHeading}>
      <div><p className={styles.eyebrow}>Valor de mercado</p><h2>Cotizaciones</h2></div>
      <p>Consultá el valor vigente y cómo cambió con el tiempo.</p>
    </div>
    <div className={styles.topGrid}>
      <div className={styles.currentPanel}>
        <div className={styles.panelHeading}><h3>Cotización actual</h3><span className={styles.currentBadge}>Más reciente</span></div>
        <div role="status">
          {quotes.history.status === "loading" && <p className={styles.state}>Cargando cotizaciones…</p>}
          {quotes.history.status === "empty" && <p className={styles.state}>No hay cotización disponible</p>}
        </div>
        {quotes.history.status === "error" && <div className={styles.state} role="alert"><p>{quotes.history.error}</p><button type="button" onClick={quotes.retryHistory}>Reintentar historial</button></div>}
        {quotes.current && <div key={`current:${quotes.history.generation}`}><QuoteSummary quote={quotes.current} context="cotización actual" variant="featured" /></div>}
      </div>
      <QuoteDateQuery quotes={quotes} />
    </div>
    {(quotes.history.status === "success" || quotes.history.status === "empty") && <QuoteHistory items={quotes.history.items} generation={quotes.history.generation} />}
  </section>;
}
