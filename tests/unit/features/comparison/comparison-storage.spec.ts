import { describe, expect, it } from 'vitest';
import { League, Position } from '@/backend/models/enums';
import type { CatalogPlayer } from '@/frontend/features/catalog/player-catalog';
import { readLastComparison, saveLastComparison } from '@/frontend/features/comparison/comparison-storage';

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value); },
    removeItem: (key: string) => { items.delete(key); },
  };
}

const player = (id: string): CatalogPlayer => ({
  id,
  name: `Jugador ${id}`,
  team: 'Equipo',
  league: League.LA_LIGA,
  position: Position.FORWARD,
  statistics: { rating: 8.5 },
});

describe('last comparison storage', () => {
  it('restores up to three distinct players only for the same user', () => {
    const storage = memoryStorage();
    saveLastComparison(storage, 'user-a', [player('1'), player('2'), player('3'), player('4')]);

    expect(readLastComparison(storage, 'user-a').map((item) => item.id)).toEqual(['1', '2', '3']);
    expect(readLastComparison(storage, 'user-b')).toEqual([]);

    saveLastComparison(storage, 'user-a', []);
    expect(readLastComparison(storage, 'user-a')).toEqual([]);
  });

  it('ignores corrupt and duplicate stored entries', () => {
    const storage = memoryStorage();
    storage.setItem('player-comparison:v1:user-a', '{invalid');
    expect(readLastComparison(storage, 'user-a')).toEqual([]);

    storage.setItem('player-comparison:v1:user-a', JSON.stringify([player('1'), player('1'), { id: 'bad' }, player('2')]));
    expect(readLastComparison(storage, 'user-a').map((item) => item.id)).toEqual(['1', '2']);
  });

  it('keeps working when browser storage is unavailable', () => {
    const storage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    };

    expect(readLastComparison(storage, 'user-a')).toEqual([]);
    expect(() => saveLastComparison(storage, 'user-a', [player('1')])).not.toThrow();
  });
});
