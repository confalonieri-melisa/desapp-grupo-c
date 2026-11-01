import path from "node:path";
import { test } from "@playwright/test";

const authDirectory = path.join(process.cwd(), "test-results", ".auth");

export const AUTH_STATE = {
  investor: path.join(authDirectory, "investor.json"),
  superuser: path.join(authDirectory, "superuser.json"),
} as const;

export const investorTest = test.extend({ storageState: AUTH_STATE.investor });
export const superuserTest = test.extend({ storageState: AUTH_STATE.superuser });
export const anonymousTest = test.extend({ storageState: { cookies: [], origins: [] } });
