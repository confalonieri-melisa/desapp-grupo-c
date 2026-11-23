import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "@/backend/config/env";
import * as schema from "./schema";

export const postgresClient = postgres(env.DATABASE_URL, {
  max: 10,
  prepare: false,
});

export const db = drizzle(postgresClient, { schema });
export type Database = typeof db;

export function databaseForReservedConnection(
  connection: Awaited<ReturnType<typeof postgresClient.reserve>>,
): Database {
  Object.assign(connection, {
    options: postgresClient.options,
    begin: async <T>(work: (client: typeof connection) => Promise<T>): Promise<T> => {
      await connection.unsafe("begin");
      try {
        const value = await work(connection);
        await connection.unsafe("commit");
        return value;
      } catch (error) {
        try {
          await connection.unsafe("rollback");
        } catch {
        }
        throw error;
      }
    },
  });
  return drizzle(connection as typeof postgresClient, { schema }) as Database;
}

export async function closeDatabase(): Promise<void> {
  await postgresClient.end({ timeout: 5 });
}
