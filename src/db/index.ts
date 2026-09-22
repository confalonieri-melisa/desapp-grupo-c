import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "@/config/env";
import * as schema from "./schema";

export const postgresClient = postgres(env.DATABASE_URL, {
  max: 10,
  prepare: false,
});

export const db = drizzle(postgresClient, { schema });
export type Database = typeof db;

export async function closeDatabase(): Promise<void> {
  await postgresClient.end({ timeout: 5 });
}
