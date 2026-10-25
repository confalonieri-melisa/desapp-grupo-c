import { Player } from "@/backend/models/Player";
import { playerCatalogQuerySchema } from "@/backend/schemas/player.schema";
import { validate } from "@/backend/utils/validate";
import { toPagination, type Pagination } from "@/backend/utils/pagination";
import { PlayerService } from "@/backend/services/player.service";

interface PlayerSummaryResponse {
  id: string;
  name: string;
  team: string;
  league: Player["league"];
  position: Player["position"];
  statistics: Player["statistics"];
  currentQuote: number;
  totalTokens: number;
}

interface PlayerDetailResponse extends PlayerSummaryResponse {
  createdAt: Date;
  updatedAt: Date;
}

export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  async getPlayers(query: unknown): Promise<{
    data: PlayerSummaryResponse[];
    pagination: Pagination;
  }> {
    const criteria = validate(playerCatalogQuerySchema, query);
    const result = await this.playerService.catalog(criteria);

    return {
      data: result.players.map((player) => this.toSummary(player)),
      pagination: toPagination(result.total, result.page, result.limit),
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
      statistics: player.statistics,
      currentQuote: 1,
      totalTokens: 100,
    };
  }

  private toDetail(player: Player): PlayerDetailResponse {
    return {
      ...this.toSummary(player),
      createdAt: player.createdAt,
      updatedAt: player.updatedAt,
    };
  }
}
