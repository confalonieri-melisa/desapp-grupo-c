import { playerRankingQuerySchema } from "@/backend/schemas/player-ranking.schema";
import { PlayerRankingService } from "@/backend/services/player-ranking.service";
import { validate } from "@/backend/utils/validate";

export class PlayerRankingController {
  constructor(private readonly service: PlayerRankingService) {}

  async getRanking(query: unknown) {
    const criteria = validate(playerRankingQuerySchema, query);
    return this.service.getRanking(criteria);
  }
}
