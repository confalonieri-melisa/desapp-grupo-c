import type {PlayerStatistics} from '@/backend/models/Player';
import type {League, Position} from '@/backend/models/enums';

export interface CatalogPlayer {
    id: string;
    name: string;
    team: string;
    league: League;
    position: Position;
    statistics: PlayerStatistics;
    currentQuote?: number;
    totalTokens?: number;
    imageUrl?: string;
}

export interface PlayerCatalogFilters {
    league: League | '';
    team: string;
    position: Position | '';
}
