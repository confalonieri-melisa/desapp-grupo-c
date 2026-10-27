import type { League } from '@/backend/models/enums';

export interface TransactionHistoryItem {
  id: string;
  type: 'BUY' | 'SELL';
  playerId: string;
  quantity: number;
  quoteId: string;
  quoteValue: number;
  total: number;
  unit: string;
  createdAt: string;
  correlationId: string | null;
}

export interface TransactionHistoryResponse {
  items: TransactionHistoryItem[];
  limit: number;
  offset: number;
  hasMore: boolean;
}

export type PlayerReference =
  | { status: 'pending' | 'unavailable' }
  | { status: 'resolved'; name: string; team?: string; league?: League; imageUrl?: string };

export interface HistoryViewState {
  sessionKey: string | null;
  items: TransactionHistoryItem[];
  players: Record<string, PlayerReference>;
  phase: 'initial-loading' | 'content' | 'empty' | 'initial-error' | 'loading-more' | 'page-error' | 'access-denied';
  nextOffset: number;
  hasMore: boolean;
  error: string | null;
}

export const HISTORY_PAGE_SIZE = 20;

const numberFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 20 });
const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false,
});
const dateOnlyFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric',
});
const timeOnlyFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false,
});
const monthFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit',
});
const monthLabelFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: 'long',
});

export function formatHistoryNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatHistoryDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function formatHistoryDateOnly(value: string): string {
  return dateOnlyFormatter.format(new Date(value));
}

export function formatHistoryTimeOnly(value: string): string {
  return timeOnlyFormatter.format(new Date(value));
}

export function historyMonthKey(value: string): string {
  const parts = monthFormatter.formatToParts(new Date(value));
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return `${year}-${month?.padStart(2, '0')}`;
}

export function historyMonthLabel(value: string): string {
  return monthLabelFormatter.format(new Date(value));
}

export interface HistoryFilters {
  search: string;
  type: 'ALL' | 'BUY' | 'SELL';
  period: string;
}

export function filterHistoryItems(
  items: TransactionHistoryItem[],
  players: Record<string, PlayerReference>,
  filters: HistoryFilters,
): TransactionHistoryItem[] {
  const search = filters.search.trim().toLocaleLowerCase('es-AR');
  return items.filter((item) => {
    const player = players[item.playerId];
    const playerName = player?.status === 'resolved' ? player.name : '';
    return (filters.type === 'ALL' || item.type === filters.type) &&
      (filters.period === 'ALL' || historyMonthKey(item.createdAt) === filters.period) &&
      (!search || `${playerName} ${item.playerId}`.toLocaleLowerCase('es-AR').includes(search));
  });
}

export function formatQuoteUnit(unit: string): string {
  return unit === 'CREDIT_PER_TOKEN' ? 'créditos por token' : unit;
}

export function mergeHistoryPage(
  previous: TransactionHistoryItem[],
  response: TransactionHistoryResponse,
): { items: TransactionHistoryItem[]; nextOffset: number; hasMore: boolean } {
  const ids = new Set(previous.map((item) => item.id));
  const items = [...previous];
  for (const item of response.items) {
    if (!ids.has(item.id)) {
      ids.add(item.id);
      items.push(item);
    }
  }
  return {
    items,
    nextOffset: response.offset + response.items.length,
    hasMore: response.hasMore,
  };
}
