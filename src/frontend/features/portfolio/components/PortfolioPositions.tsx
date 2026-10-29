"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import type { PortfolioSnapshot } from "@/frontend/services/client/player-trading.service";
import type { PlayerApiDetail } from "@/frontend/services/client/player.service";
import { formatCredits, formatNumber } from "../portfolio";
import { PortfolioPlayer } from "./PortfolioPlayer";
import styles from "@/app/portfolio/PortfolioPage.module.scss";

export function PortfolioPositions({ snapshot, names, players = {} }: { snapshot: PortfolioSnapshot; names: Record<string, string>; players?: Record<string, PlayerApiDetail> }) {
  const [query, setQuery] = useState("");
  const filtered = snapshot.items.filter((item) => {
    const player = players[item.playerId];
    return `${names[item.playerId] ?? item.playerId} ${player?.team ?? ""} ${player?.league ?? ""}`.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es"));
  });
  return <section aria-labelledby="portfolio-positions-title" className={styles.positionsSection}>
    <div className={styles.sectionHeading}>
      <div><h2 id="portfolio-positions-title">Mis jugadores</h2><p>Detalle de tus tenencias actuales.</p></div>
      <div className={styles.sectionTools}>
        <label className={styles.searchField}><Search size={17} aria-hidden="true" /><span className={styles.visuallyHidden}>Buscar jugador</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar jugador..." /></label>
        <span className={styles.positionCount}>{snapshot.items.length} {snapshot.items.length === 1 ? "posición" : "posiciones"}</span>
      </div>
    </div>
    {snapshot.items.length === 0 ? <p className={styles.emptyMessage}>No tenés posiciones en tu portfolio.</p> : filtered.length === 0 ? <p className={styles.emptyMessage}>No hay jugadores que coincidan con la búsqueda.</p> :
      <div className={styles.positionTable}>
        <div className={styles.positionHeader} aria-hidden="true"><span>Jugador</span><span>Tenencia</span><span>Precio promedio</span><span>Cotización actual</span><span>Valor actual</span><span>Ganancia o pérdida</span><span>Acciones</span></div>
        <ul className={styles.positionList}>{filtered.map((item) => <li className={styles.positionRow} key={item.playerId}>
          <PortfolioPlayer id={item.playerId} name={names[item.playerId] || item.playerId} player={players[item.playerId]} />
          <dl className={styles.positionMetrics}>
            <div><dt>Tenencia</dt><dd>{formatNumber(item.quantity)} <small>tokens</small></dd></div>
            <div><dt>Precio promedio</dt><dd>{formatCredits(item.averagePurchasePrice)}</dd></div>
            <div><dt>Cotización actual</dt><dd>{formatCredits(item.currentQuoteValue)}</dd></div>
            <div><dt>Valor actual</dt><dd>{formatCredits(item.currentValue)}</dd></div>
            <div className={item.unrealizedPnl === null ? "" : item.unrealizedPnl >= 0 ? styles.gain : styles.loss}><dt>Ganancia o pérdida</dt><dd>{item.unrealizedPnl !== null && item.unrealizedPnl > 0 ? "+" : ""}{formatCredits(item.unrealizedPnl)}</dd></div>
          </dl>
          <Link className={styles.positionAction} href={`/players/${encodeURIComponent(item.playerId)}`}>Ver <ArrowRight size={15} aria-hidden="true" /></Link>
        </li>)}</ul>
      </div>}
  </section>;
}
