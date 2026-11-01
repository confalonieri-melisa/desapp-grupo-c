import { test } from "@playwright/test";
import { cleanE2EData } from "./fixtures/database";

test("remove E2E fixture records", async () => {
  await cleanE2EData();
});
