import { Player } from "@/models/Player";
import {
  PlayerRepository,
  type PlayerPagination,
} from "@/repositories/player.repository";
import { NotFoundError } from "@/errors/http.error";
import type {
  PlayerCatalogCriteria,
  PlayerCatalogResult,
} from "@/services/player.types";

/** Application service for player use cases, including source synchronization. */
export class PlayerService {
  constructor(private readonly playerRepository: PlayerRepository) {}

  async getById(id: string): Promise<Player> {
    const player = await this.playerRepository.findById(id);
    if (!player) {
      throw new NotFoundError("Player not found");
    }

    return player;
  }

  async catalog(criteria: PlayerCatalogCriteria = {}): Promise<PlayerCatalogResult> {
    const pagination: PlayerPagination = {
      page: criteria.page ?? 1,
      limit: criteria.limit ?? 20,
    };
    const result = await this.playerRepository.findMany(
      {
        league: criteria.league,
        team: criteria.team?.trim() || undefined,
        position: criteria.position,
      },
      pagination,
    );

    return {
      players: result.data,
      total: result.total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }
}
