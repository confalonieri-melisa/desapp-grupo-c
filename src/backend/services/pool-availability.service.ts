import { PlayerRepository } from "@/backend/repositories/player.repository";
import { PoolAvailabilityRepository } from "@/backend/repositories/pool-availability.repository";
import { NotFoundError } from "@/backend/errors/http.error";
export class PoolAvailabilityService {
  constructor(
    private readonly players = new PlayerRepository(),
    private readonly pool = new PoolAvailabilityRepository(),
  ) {}
  async getAvailability(playerId: string) {
    if (!(await this.players.findById(playerId))) throw new NotFoundError("Player not found");
    return { playerId, availableQuantity: await this.pool.getAvailableQuantity(playerId) };
  }
}
