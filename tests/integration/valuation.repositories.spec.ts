import { afterAll, afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDatabase, db } from "@/backend/db";
import { players, playerQuotes, users, valuationStrategyVersions } from "@/backend/db/schema";
import { League, Position, UserRole } from "@/backend/models/enums";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";
import { buildValuationConfig } from "@/backend/services/valuation-strategy.service";

const userId = "00000000-0000-0000-0000-000000000201";
const playerId = "00000000-0000-0000-0000-000000000202";
const repository = new ValuationRepository();

describe.skipIf(process.env.RUN_DB_INTEGRATION_TESTS !== "true")(
  "valuation repositories",
  () => {
    afterEach(async () => {
      await db.delete(playerQuotes).where(eq(playerQuotes.playerId, playerId));
      await db.delete(valuationStrategyVersions);
      await db.delete(players).where(eq(players.id, playerId));
      await db.delete(users).where(eq(users.id, userId));
    });

    afterAll(async () => {
      await closeDatabase();
    });

    it("keeps one active version and does not mutate an existing version", async () => {
      await db.insert(users).values({
        id: userId,
        email: "valuation-repository-test@example.com",
        password: "secret",
        name: "Valuation Test",
        role: UserRole.SUPERUSER,
      });

      const first = await repository.activateStrategyVersion(
        "INDIVIDUAL_PERFORMANCE",
        "1.0.0",
        buildValuationConfig("INDIVIDUAL_PERFORMANCE"),
        userId,
      );
      await repository.activateStrategyVersion(
        "INDIVIDUAL_PLUS_TEAM_CONTEXT",
        "1.0.0",
        buildValuationConfig("INDIVIDUAL_PLUS_TEAM_CONTEXT"),
        userId,
      );

      const versions = await db.select().from(valuationStrategyVersions);
      expect(versions).toHaveLength(2);
      expect(versions.filter((version) => version.isActive === 1)).toHaveLength(1);
      expect(versions.find((version) => version.id === first.id)?.isActive).toBe(0);
      expect(versions.find((version) => version.id === first.id)?.configuration)
        .toEqual(buildValuationConfig("INDIVIDUAL_PERFORMANCE"));
    });

    it("appends quotes for the same player", async () => {
      await db.insert(users).values({
        id: userId,
        email: "valuation-quotes-test@example.com",
        password: "secret",
        name: "Valuation Quotes Test",
        role: UserRole.SUPERUSER,
      });
      await db.insert(players).values({
        id: playerId,
        source: "WHOSCORED",
        externalId: "valuation-player-1",
        name: "Valuation Player",
        team: "Example FC",
        league: League.PREMIER_LEAGUE,
        position: Position.FORWARD,
        statistics: { rating: 7 },
      });

      const version = await repository.activateStrategyVersion(
        "INDIVIDUAL_PERFORMANCE",
        "1.0.0",
        buildValuationConfig("INDIVIDUAL_PERFORMANCE"),
        userId,
      );
      const quote = {
        playerId,
        strategyVersionId: version.id,
        individualScore: 0.5,
        teamScore: null,
        finalScore: 0.5,
        quoteValue: 50.5,
        explanation: {},
      };

      await repository.saveQuote(quote);
      await repository.saveQuote(quote);

      const quotes = await db.select().from(playerQuotes).where(eq(playerQuotes.playerId, playerId));
      expect(quotes).toHaveLength(2);
    });
  },
);
