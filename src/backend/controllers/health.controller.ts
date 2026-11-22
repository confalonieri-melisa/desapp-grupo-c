import { HealthService } from "@/backend/services/health.service";

export class HealthController {
  constructor(private readonly service = new HealthService()) {}

  getHealth() {
    return this.service.getHealth();
  }

  getLiveness() {
    return this.service.getLiveness();
  }

  getReadiness() {
    return this.service.getReadiness();
  }
}
