import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, closeDatabase } from "@/backend/db";
import { players, users, tokenHoldings } from "@/backend/db/schema";
import { League, Position, UserRole } from "@/backend/models/enums";
import { PoolAvailabilityRepository } from "@/backend/repositories/pool-availability.repository";
const id = "77777777-7777-4777-8777-777777777777";
describe.skipIf(process.env.RUN_DB_INTEGRATION_TESTS !== "true")("pool read repository", () => {
  afterAll(closeDatabase);
  it("reads canonical pool without changing holdings", async () => {
    await db
      .insert(players)
      .values({
        id,
        source: "TEST",
        externalId: "pool-ui",
        name: "Pool UI",
        team: "Test",
        league: League.PREMIER_LEAGUE,
        position: Position.FORWARD,
        statistics: {},
      });
    await db
      .insert(users)
      .values({
        id,
        email: "pool-ui@test.example",
        password: "test",
        name: "Pool UI",
        role: UserRole.SUPERUSER,
      });
    const repo = new PoolAvailabilityRepository();
    try {
      expect(await repo.getAvailableQuantity(id)).toBe(0);
      await db.insert(tokenHoldings).values({ userId: id, playerId: id, quantity: 8 });
      const before = await db.select().from(tokenHoldings).where(eq(tokenHoldings.playerId, id));
      expect(await repo.getAvailableQuantity(id)).toBe(8);
      expect(await db.select().from(tokenHoldings).where(eq(tokenHoldings.playerId, id))).toEqual(
        before,
      );
      await db.update(tokenHoldings).set({ quantity: 0 }).where(eq(tokenHoldings.playerId, id));
      expect(await repo.getAvailableQuantity(id)).toBe(0);
    } finally {
      await db.delete(tokenHoldings).where(eq(tokenHoldings.playerId, id));
      await db.delete(players).where(eq(players.id, id));
      await db.delete(users).where(eq(users.id, id));
    }
  });
});
