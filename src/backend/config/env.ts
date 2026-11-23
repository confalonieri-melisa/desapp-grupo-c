import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const batchWeekday = z.coerce.number().int().min(1).max(7);
const batchTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected local time HH:mm");
const batchTimezone = z.string().refine((zone) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}, "Expected an IANA timezone");

export const envSchema = z.object({
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/desapp_db"),
  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET must be at least 16 characters long")
    .default("secret-jwt-key-desapp-grupo-c-min-32-chars"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  WHOSCORED_PYTHON_PATH: z.string().trim().min(1).default("python"),
  WHOSCORED_SCRIPT_PATH: z.string().trim().min(1).default("scripts/whoscored_scraper.py"),
  WHOSCORED_URL: z.string().url().default("https://www.whoscored.com/Statistics"),
  WHOSCORED_MAX_PAGES: z.coerce.number().int().positive().max(140).default(140),
  WHOSCORED_LIMIT: z.coerce.number().int().positive().optional(),
  WHOSCORED_HEADLESS: z.preprocess(parseBooleanEnvironmentValue, z.boolean().default(false)),
  FOOTBALL_DATA_BASE_URL: z.string().url().default("https://api.football-data.org"),
  FOOTBALL_DATA_TOKEN: z.string().trim().min(1).default("test-football-data-token"),
  FOOTBALL_DATA_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  FOOTBALL_DATA_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  CURRENT_MARKET_SEASON: z.coerce.number().int().min(2000).default(2026),
  BATCH_SYNC_WEEKDAY: batchWeekday.default(2),
  BATCH_SYNC_TIME: batchTime.default("18:00"),
  BATCH_SYNC_TIMEZONE: batchTimezone.default("America/Argentina/Buenos_Aires"),
  BATCH_RECALC_WEEKDAY: batchWeekday.default(2),
  BATCH_RECALC_TIME: batchTime.default("18:15"),
  BATCH_RECALC_TIMEZONE: batchTimezone.default("America/Argentina/Buenos_Aires"),
  BATCH_POLL_SECONDS: z.coerce.number().int().min(1).max(30).default(15),
});

function parseBooleanEnvironmentValue(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const normalizedValue = value.toLowerCase();
  if (normalizedValue === "true") return true;
  if (normalizedValue === "false") return false;
  return value;
}

export const parseEnv = (override?: Record<string, unknown>) => {
  const result = envSchema.safeParse(override || process.env);
  if (!result.success) {
    console.error("Invalid environment configuration:", result.error.format());
    throw new Error("Invalid environment configuration");
  }
  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
