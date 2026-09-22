import { afterAll, afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, closeDatabase } from "@/db";
import { players, users } from "@/db/schema";
import { League, Position, UserRole } from "@/models/enums";
import { Player } from "@/models/Player";
import { User } from "@/models/User";
import { PlayerRepository } from "@/repositories/player.repository";
import { UserRepository } from "@/repositories/user.repository";

const userId = "00000000-0000-0000-0000-000000000101";
const playerId = "00000000-0000-0000-0000-000000000102";
const userRepository = new UserRepository();
const playerRepository = new PlayerRepository();

describe.skipIf(process.env.RUN_DB_INTEGRATION_TESTS !== "true")(
  "repositories",
  () => {
    afterEach(async () => {
      await db.delete(users).where(eq(users.id, userId));
      await db.delete(players).where(eq(players.id, playerId));
    });

    afterAll(async () => {
      await closeDatabase();
    });

    it("persists a user and retrieves it by id and email", async () => {
      const user = new User({
        id: userId,
        email: "repository-test@example.com",
        name: "Repository Test",
        password: "secret",
        role: UserRole.INVESTOR,
        creditBalance: 1000,
      });

      const persisted = await userRepository.save(user);

      await expect(userRepository.findById(userId)).resolves.toMatchObject({
        id: userId,
        email: user.email,
        creditBalance: 1000,
      });
      await expect(
        userRepository.findByEmail(user.email),
      ).resolves.toMatchObject({
        id: persisted.id,
        name: user.name,
      });
      await expect(
        userRepository.findById("00000000-0000-0000-0000-000000000999"),
      ).resolves.toBeNull();
    });

    it("upserts a player and returns the updated persisted aggregate", async () => {
      const first = new Player({
        id: playerId,
        name: "Player One",
        team: "Team One",
        league: League.PREMIER_LEAGUE,
        position: Position.FORWARD,
        statistics: { goals: 2 },
      });

      await playerRepository.savePlayers([
        { player: first, source: "TEST", externalId: "external-1" },
      ]);

      const updated = new Player({
        id: playerId,
        name: "Player Updated",
        team: "Team Two",
        league: League.PREMIER_LEAGUE,
        position: Position.FORWARD,
        statistics: { goals: 5 },
      });
      const persisted = await playerRepository.savePlayers([
        { player: updated, source: "TEST", externalId: "external-1" },
      ]);

      expect(persisted).toHaveLength(1);
      expect(persisted[0]).toMatchObject({
        id: playerId,
        name: "Player Updated",
        team: "Team Two",
        statistics: { goals: 5 },
      });
    });
  });
