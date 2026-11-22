import { sql } from "drizzle-orm";
import { db as defaultDatabase, type Database } from "@/backend/db";
import { HEALTH_STATUS, type DatabaseHealth } from "@/backend/models/health";

export class SystemHealthRepository {
  constructor(private readonly database: Pick<Database, "execute"> = defaultDatabase) {}

  async checkDatabase(): Promise<DatabaseHealth> {
    try {
      await this.database.execute(sql`select 1`);
      return { dependency: "database", status: HEALTH_STATUS.OK };
    } catch {
      return { dependency: "database", status: HEALTH_STATUS.UNHEALTHY };
    }
  }
}
