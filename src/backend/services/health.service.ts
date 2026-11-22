import {
  HEALTH_CHECK,
  HEALTH_STATUS,
  type HealthResponse,
  type OperationalHealthResponse,
} from "@/backend/models/health";
import { SystemHealthRepository } from "@/backend/repositories/system-health.repository";

export class HealthService {
  constructor(private readonly systemHealthRepository = new SystemHealthRepository()) {}

  getHealth(): HealthResponse {
    return { status: HEALTH_STATUS.OK };
  }

  getLiveness(): OperationalHealthResponse {
    return { status: HEALTH_STATUS.OK, check: HEALTH_CHECK.LIVE };
  }

  async getReadiness(): Promise<OperationalHealthResponse> {
    const database = await this.systemHealthRepository.checkDatabase();

    return {
      status: database.status,
      check: HEALTH_CHECK.READY,
      database: database.status,
    };
  }
}
