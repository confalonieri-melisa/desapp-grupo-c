import type { CatalogPlayer } from '@/frontend/features/catalog/player-catalog';
import type { PlayerQuoteDto } from '@/frontend/services/client/player-quotes.service';

export const MAX_COMPARISON_PLAYERS = 3;
export const MAX_COMPARISON_QUOTES = 15;

export const COMPARISON_ROWS = [
  'currentQuote',
  'variation',
  'individualScore',
  'teamScore',
  'finalScore',
] as const;

export type ComparisonRowKey = (typeof COMPARISON_ROWS)[number];

export interface QuoteChannel {
  phase: 'idle' | 'loading' | 'success' | 'empty' | 'error';
  items: PlayerQuoteDto[];
  error: string | null;
  generation: number;
}

export interface ComparisonPlayer extends CatalogPlayer {
  history: QuoteChannel;
}

export interface SearchState {
  phase: 'idle' | 'loading' | 'content' | 'empty' | 'error';
  query: string;
  results: CatalogPlayer[];
  error: string | null;
}

export interface ComparisonRow {
  key: ComparisonRowKey;
  label: string;
  values: Array<number | string | null>;
}

export interface QuotePoint {
  timestamp: number;
  value: number;
  calculatedAt: string;
}

export interface QuoteSeries {
  playerId: string;
  playerName: string;
  points: QuotePoint[];
  phase: 'insufficient' | 'ready';
}

export const emptyQuoteChannel = (generation = 0): QuoteChannel => ({
  phase: 'idle',
  items: [],
  error: null,
  generation,
});

export function addSelectedPlayer(
  selected: readonly CatalogPlayer[],
  player: CatalogPlayer,
): CatalogPlayer[] {
  const alreadySelected = selected.some((item) => item.id === player.id);

  if (alreadySelected || selected.length >= MAX_COMPARISON_PLAYERS) {
    return [...selected];
  }

  return [...selected, player];
}

export function removeSelectedPlayer(
  selected: readonly CatalogPlayer[],
  playerId: string,
): CatalogPlayer[] {
  return selected.filter((player) => player.id !== playerId);
}

export function getCurrentQuote(
  items: readonly PlayerQuoteDto[],
): PlayerQuoteDto | null {
  return items[0] ?? null;
}

export function calculateQuoteVariation(
  items: readonly PlayerQuoteDto[],
): number | null {
  const current = items[0]?.quoteValue;
  const previous = items[1]?.quoteValue;

  if (current === undefined || previous === undefined || previous === 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

export function buildComparisonRows(
  players: readonly ComparisonPlayer[],
): ComparisonRow[] {
  return [
    {
      key: 'currentQuote',
      label: 'Cotización actual',
      values: players.map(
        (player) => getCurrentQuote(player.history.items)?.quoteValue ?? null,
      ),
    },
    {
      key: 'variation',
      label: 'Variación desde la última cotización',
      values: players.map((player) =>
        calculateQuoteVariation(player.history.items),
      ),
    },
    {
      key: 'individualScore',
      label: 'Score individual',
      values: players.map(
        (player) =>
          getCurrentQuote(player.history.items)?.score?.individualScore ?? null,
      ),
    },
    {
      key: 'teamScore',
      label: 'Score colectivo',
      values: players.map(
        (player) => getCurrentQuote(player.history.items)?.score?.teamScore ?? null,
      ),
    },
    {
      key: 'finalScore',
      label: 'Score final',
      values: players.map(
        (player) => getCurrentQuote(player.history.items)?.score?.finalScore ?? null,
      ),
    },
  ];
}

export function buildQuoteSeries(player: ComparisonPlayer): QuoteSeries {
  const points = [...player.history.items]
    .sort((a, b) => Date.parse(a.calculatedAt) - Date.parse(b.calculatedAt))
    .slice(-MAX_COMPARISON_QUOTES)
    .map((quote) => ({
      timestamp: Date.parse(quote.calculatedAt),
      value: quote.quoteValue,
      calculatedAt: quote.calculatedAt,
    }));

  return {
    playerId: player.id,
    playerName: player.name,
    points,
    phase: points.length >= 2 ? 'ready' : 'insufficient',
  };
}

export function formatComparisonValue(
  value: number | string | null,
  key: ComparisonRowKey,
): string {
  if (value === null || value === undefined) {
    return 'No disponible';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (key === 'variation') {
    const sign = value > 0 ? '+' : '';
    const formatted = new Intl.NumberFormat('es-AR', {
      maximumFractionDigits: 2,
    }).format(value);

    return `${sign}${formatted}%`;
  }

  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 4,
  }).format(value);
}
