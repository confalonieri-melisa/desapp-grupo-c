'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BarChart3, Coins, ExternalLink, Globe2, Plus, Shield, Star, UserRound, X } from 'lucide-react';
import {
  calculateQuoteVariation,
  formatComparisonValue,
  getCurrentQuote,
  type ComparisonPlayer,
} from '@/frontend/features/comparison/comparison';
import { getPlayerImage } from '@/frontend/utils/image-mapper';
import { leagueLabels } from '@/frontend/utils/player-labels';
import styles from '@/app/comparison/ComparisonPage.module.scss';

interface Props {
  player: ComparisonPlayer;
  onRemove: (id: string) => void;
  onFocusSearch: () => void;
}

export default function ComparisonSelection({ player, onRemove, onFocusSearch }: Props) {
  const quote = getCurrentQuote(player.history.items);
  const variation = calculateQuoteVariation(player.history.items);
  const profileHref = `/players/${encodeURIComponent(player.id)}`;
  const rating = player.statistics.rating;

  return (
    <div className={styles.selectionGrid} aria-label="Jugadores para comparar">
      <article className={styles.selectionCard}>
        <button
          className={styles.selectionRemove}
          type="button"
          aria-label={`Quitar a ${player.name}`}
          onClick={() => onRemove(player.id)}
        >
          <X aria-hidden="true" size={16} />
        </button>
        <div className={styles.selectionIdentity}>
          <span className={styles.selectionPhoto}>
            <Image
              src={getPlayerImage(player.id, player.imageUrl)}
              alt=""
              fill
              sizes="(max-width: 600px) 100px, 110px"
            />
          </span>
          <div className={styles.selectionInfo}>
            <h2>{player.name}</h2>
            <span className={styles.selectionDetail}><Shield aria-hidden="true" size={12} />{player.team}</span>
            <span className={styles.selectionDetail}><Globe2 aria-hidden="true" size={12} />{leagueLabels[player.league]}</span>
            <span className={styles.selectionPosition}>{player.position}</span>
          </div>
          {rating !== undefined && (
            <span className={styles.selectionRating} aria-label={`Rating ${rating}`}>
              <strong>{rating}</strong>
              <small>Rating</small>
            </span>
          )}
        </div>

        <div className={styles.selectionMetrics}>
          <div className={styles.selectionMetric}>
            <Coins aria-hidden="true" size={18} />
            <strong>{quote ? formatComparisonValue(quote.quoteValue, 'currentQuote') : '—'}</strong>
            <small>créditos</small>
          </div>
          <div className={styles.selectionMetric}>
            <BarChart3 aria-hidden="true" size={18} />
            <strong className={variation === null ? undefined : variation >= 0 ? styles.positive : styles.negative}>
              {variation === null ? '—' : formatComparisonValue(variation, 'variation')}
            </strong>
            <small>variación</small>
          </div>
          <div className={styles.selectionMetric}>
            <Star aria-hidden="true" size={18} />
            <strong>{quote?.score?.finalScore == null ? '—' : formatComparisonValue(quote.score.finalScore, 'finalScore')}</strong>
            <small>score final</small>
          </div>
        </div>

        <div className={styles.selectionActions}>
          <Link href={profileHref} className={styles.profileAction}>
            <ExternalLink aria-hidden="true" size={16} /> Ver perfil
          </Link>
        </div>
      </article>

      {[1, 2].map((slot) => (
        <button
          className={styles.selectionSlot}
          type="button"
          key={slot}
          onClick={onFocusSearch}
          aria-label={`Agregar jugador en el espacio ${slot + 1}`}
        >
          <span className={styles.selectionSlotIcon} aria-hidden="true">
            <UserRound size={32} />
            <span><Plus size={13} /></span>
          </span>
          <strong>Agregá un jugador</strong>
          <span>Buscá en el catálogo para comparar hasta 3 jugadores.</span>
        </button>
      ))}
    </div>
  );
}
