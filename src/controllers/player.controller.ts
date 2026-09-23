import { Player } from "@/models/Player";
import { validate } from "@/utils/validate";
import { playerCatalogQuerySchema } from "@/schemas/player.schema";
import { PlayerService } from "@/services/player.service";
import type { PlayerCatalogResult } from "@/services/player.types";

interface PlayerSummaryResponse {
  id: string;
  name: string;
  team: string;
  league: Player["league"];
  position: Player["position"];
  currentQuote: number;
  totalTokens: number;
}

interface PlayerDetailResponse extends PlayerSummaryResponse {
  statistics: Player["statistics"];
  createdAt: Date;
  updatedAt: Date;
}

export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  async getPlayers(query: unknown): Promise<{
    data: PlayerSummaryResponse[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const criteria = validate(playerCatalogQuerySchema, query);
    const result = await this.playerService.catalog(criteria);

    return {
      data: result.players.map((player) => this.toSummary(player)),
      pagination: this.toPagination(result),
    };
  }

  async getById(id: string): Promise<PlayerDetailResponse> {
    return this.toDetail(await this.playerService.getById(id));
  }

  private toSummary(player: Player): PlayerSummaryResponse {
    return {
      id: player.id,
      name: player.name,
      team: player.team,
      league: player.league,
      position: player.position,
      currentQuote: 1,
      totalTokens: 100,
    };
  }

  private toDetail(player: Player): PlayerDetailResponse {
    return {
      ...this.toSummary(player),
      statistics: player.statistics,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt,
    };
  }

  private toPagination(result: PlayerCatalogResult) {
    return {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }
}
