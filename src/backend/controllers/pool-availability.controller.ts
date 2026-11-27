import { PoolAvailabilityService } from "@/backend/services/pool-availability.service";
export class PoolAvailabilityController {
  constructor(private readonly service = new PoolAvailabilityService()) {}
  getAvailability(playerId: string) {
    return this.service.getAvailability(playerId);
  }
}
