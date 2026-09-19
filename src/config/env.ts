import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

export const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5432/desapp_db"),
  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET must be at least 16 characters long")
    .default("secret-jwt-key-desapp-grupo-c-min-32-chars"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z
    .coerce
    .number()
    .default(3000),
  WHOSCORED_PYTHON_PATH: z.string().trim().min(1).default("python"),
  WHOSCORED_SCRIPT_PATH: z.string().trim().min(1).default("scripts/whoscored_scraper.py"),
  WHOSCORED_URL: z.string().url().default("https://www.whoscored.com/Statistics"),
  WHOSCORED_MAX_PAGES: z.coerce.number().int().positive().max(140).default(140),
  WHOSCORED_HEADLESS: z.preprocess(
    parseBooleanEnvironmentValue,
    z.boolean().default(false),
  ),
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
