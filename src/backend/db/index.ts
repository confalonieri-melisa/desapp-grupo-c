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

/** A Drizzle handle bound to the same reserved PostgreSQL session as an advisory lock. */
export function databaseForReservedConnection(
  connection: Awaited<ReturnType<typeof postgresClient.reserve>>,
): Database {
  // reserve() binds queries to one session but omits the root client's options/begin
  // helpers. Supply a transaction helper that also stays on that reserved session.
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
          /* Connection loss preserves the original error. */
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
