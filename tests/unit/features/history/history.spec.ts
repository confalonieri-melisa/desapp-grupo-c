import { describe, expect, it } from 'vitest';
import {
  filterHistoryItems, formatHistoryDate, formatHistoryDateOnly, formatHistoryNumber,
  formatHistoryTimeOnly, formatQuoteUnit, historyMonthKey, mergeHistoryPage,
  type TransactionHistoryItem,
} from '@/frontend/features/history/history';

const item = (id: string): TransactionHistoryItem => ({
  id, type: 'BUY', playerId: 'player', quantity: 2, quoteId: 'quote',
  quoteValue: 1.5, total: 3, unit: 'CREDIT_PER_TOKEN',
  createdAt: '2026-10-26T01:30:00.000Z', correlationId: null,
});

describe('history projection', () => {
  it('keeps existing rows in server order, deduplicates IDs, and advances by raw response length', () => {
    const result = mergeHistoryPage([item('a'), item('b')], {
      items: [item('b'), item('c'), item('c')], limit: 20, offset: 20, hasMore: true,
    });
    expect(result.items.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    expect(result.nextOffset).toBe(23);
    expect(result.hasMore).toBe(true);
  });

  it('formats historical values and Buenos Aires date across the UTC day boundary', () => {
    expect(formatHistoryNumber(1234.5)).toBe('1.234,5');
    expect(formatHistoryDate('2026-10-26T01:30:00.000Z')).toContain('25/10/2026');
    expect(formatHistoryDate('2026-10-26T01:30:00.000Z')).toContain('22:30');
    expect(formatHistoryDateOnly('2026-10-26T01:30:00.000Z')).toBe('25/10/2026');
    expect(formatHistoryTimeOnly('2026-10-26T01:30:00.000Z')).toBe('22:30');
    expect(historyMonthKey('2026-10-01T01:30:00.000Z')).toBe('2026-09');
    expect(formatQuoteUnit('CREDIT_PER_TOKEN')).toBe('créditos por token');
    expect(formatQuoteUnit('FUTURE_UNIT')).toBe('FUTURE_UNIT');
  });

  it('filters loaded operations by player name or ID, type, and Buenos Aires month', () => {
    const september = { ...item('a'), playerId: 'p-a', type: 'BUY' as const, createdAt: '2026-10-01T01:30:00Z' };
    const october = { ...item('b'), playerId: 'p-b', type: 'SELL' as const, createdAt: '2026-10-26T01:30:00Z' };
    const players = { 'p-a': { status: 'resolved' as const, name: 'Álvaro Valles' } };
    expect(filterHistoryItems([september, october], players, { search: 'álvaro', type: 'BUY', period: '2026-09' })).toEqual([september]);
    expect(filterHistoryItems([september, october], players, { search: 'p-b', type: 'ALL', period: 'ALL' })).toEqual([october]);
    expect(filterHistoryItems([september, october], players, { search: '', type: 'SELL', period: '2026-09' })).toEqual([]);
  });
});
