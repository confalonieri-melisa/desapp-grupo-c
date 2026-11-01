import { isOfficialLeague, isPosition } from '@/backend/models/enums';
import type { CatalogPlayer } from '@/frontend/features/catalog/player-catalog';
import { MAX_COMPARISON_PLAYERS } from '@/frontend/features/comparison/comparison';

const STORAGE_PREFIX = 'player-comparison:v1:';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function isCatalogPlayer(value: unknown): value is CatalogPlayer {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const player = value as Record<string, unknown>;
  const statistics = player.statistics;

  return typeof player.id === 'string' && player.id.length > 0
    && typeof player.name === 'string' && player.name.length > 0
    && typeof player.team === 'string' && player.team.length > 0
    && isOfficialLeague(player.league)
    && isPosition(player.position)
    && !!statistics && typeof statistics === 'object' && !Array.isArray(statistics)
    && Object.values(statistics).every((item) => typeof item === 'number' && Number.isFinite(item))
    && (player.currentQuote === undefined || typeof player.currentQuote === 'number')
    && (player.totalTokens === undefined || typeof player.totalTokens === 'number')
    && (player.imageUrl === undefined || typeof player.imageUrl === 'string');
}

export function readLastComparison(storage: Pick<Storage, 'getItem'>, userId: string): CatalogPlayer[] {
  try {
    const raw = storage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const unique = new Set<string>();
    return parsed.filter((value): value is CatalogPlayer => {
      if (!isCatalogPlayer(value) || unique.has(value.id) || unique.size >= MAX_COMPARISON_PLAYERS) {
        return false;
      }
      unique.add(value.id);
      return true;
    });
  } catch {
    return [];
  }
}

export function saveLastComparison(
  storage: Pick<Storage, 'setItem' | 'removeItem'>,
  userId: string,
  players: readonly CatalogPlayer[],
): void {
  try {
    if (players.length === 0) {
      storage.removeItem(storageKey(userId));
    } else {
      storage.setItem(storageKey(userId), JSON.stringify(players.slice(0, MAX_COMPARISON_PLAYERS)));
    }
  } catch {
    // Browsers can deny storage access; the in-memory comparison still works.
  }
}
