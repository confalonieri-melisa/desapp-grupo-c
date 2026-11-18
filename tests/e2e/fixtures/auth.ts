import path from "node:path";

const authDirectory = path.join(process.cwd(), "test-results", ".auth");

export const AUTH_STATE = {
  investor: path.join(authDirectory, "investor.json"),
  superuser: path.join(authDirectory, "superuser.json"),
} as const;

export const ANONYMOUS_STATE = { cookies: [], origins: [] };
