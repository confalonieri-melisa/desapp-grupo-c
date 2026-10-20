import { sql } from "drizzle-orm";
import {
  check,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { League, Position, UserRole } from "@/backend/models/enums";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    role: varchar("role", { length: 20 })
      .$type<UserRole>()
      .notNull()
      .default(UserRole.INVESTOR),
    creditBalance: numeric("credit_balance", { precision: 12, scale: 2 })
      .notNull()
      .default("1000.00"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("idx_users_email").on(table.email)],
);

export const players = pgTable(
  "players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: varchar("source", { length: 50 }).notNull(),
    externalId: varchar("external_id", { length: 100 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    team: varchar("team", { length: 100 }).notNull(),
    league: varchar("league", { length: 50 }).$type<League>().notNull(),
    position: varchar("position", { length: 30 }).$type<Position>().notNull(),
    statistics: jsonb("statistics")
      .$type<Record<string, number>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("uq_players_source_external_id").on(
      table.source,
      table.externalId,
    ),
  ],
);

export const tokenHoldings = pgTable(
  "token_holdings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    quantity: integer("quantity").notNull().default(0),
    averagePurchasePrice: numeric("average_purchase_price", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("1.00"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_user_player_holding").on(
      table.userId,
      table.playerId,
    ),
    check(
      "chk_token_holdings_quantity_non_negative",
      sql`${table.quantity} >= 0`,
    ),
  ],
);

export const competitionContextUpdates = pgTable("competition_context_updates", {
  id: uuid("id").defaultRandom().primaryKey(),
  season: integer("season").notNull(),
  requestedBy: uuid("requested_by").references(() => users.id),
  status: varchar("status", { length: 20 }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  errorSummary: jsonb("error_summary"),
});

export const competitionContextSnapshots = pgTable(
  "competition_context_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contextUpdateId: uuid("context_update_id").notNull().references(() => competitionContextUpdates.id),
    league: varchar("league", { length: 50 }).$type<League>().notNull(),
    season: integer("season").notNull(),
    sourceData: jsonb("source_data").notNull(),
  },
  (table) => [uniqueIndex("uq_context_snapshot_update_league").on(table.contextUpdateId, table.league)],
);

export const teamCompetitionStandings = pgTable(
  "team_competition_standings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contextUpdateId: uuid("context_update_id").notNull().references(() => competitionContextUpdates.id),
    snapshotId: uuid("snapshot_id").notNull().references(() => competitionContextSnapshots.id),
    league: varchar("league", { length: 50 }).$type<League>().notNull(),
    season: integer("season").notNull(),
    teamExternalId: varchar("team_external_id", { length: 100 }).notNull(),
    teamName: varchar("team_name", { length: 150 }).notNull(),
    position: integer("position").notNull(),
    playedGames: integer("played_games").notNull(),
    points: integer("points").notNull(),
    goalDifference: integer("goal_difference").notNull(),
  },
  (table) => [
    uniqueIndex("uq_context_standing_update_league_team").on(table.contextUpdateId, table.league, table.teamExternalId),
    check("chk_context_standing_position_nonnegative", sql`${table.position} >= 0`),
    check("chk_context_standing_played_nonnegative", sql`${table.playedGames} >= 0`),
    check("chk_context_standing_points_nonnegative", sql`${table.points} >= 0`),
  ],
);

export const teamSourceLinks = pgTable(
  "team_source_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    league: varchar("league", { length: 50 }).$type<League>().notNull(),
    season: integer("season").notNull(),
    whoscoredTeamName: varchar("whoscored_team_name", { length: 150 }).notNull(),
    footballDataTeamExternalId: varchar("football_data_team_external_id", { length: 100 }).notNull(),
    footballDataTeamName: varchar("football_data_team_name", { length: 150 }).notNull(),
  },
  (table) => [
    uniqueIndex("uq_team_source_link_whoscored").on(table.league, table.season, table.whoscoredTeamName),
    uniqueIndex("uq_team_source_link_football_data").on(table.league, table.season, table.footballDataTeamExternalId),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type PlayerRow = typeof players.$inferSelect;
export type NewPlayerRow = typeof players.$inferInsert;
export type TokenHoldingRow = typeof tokenHoldings.$inferSelect;
