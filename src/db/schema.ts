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
import { League, Position, UserRole } from "@/models/enums";

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

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type PlayerRow = typeof players.$inferSelect;
export type NewPlayerRow = typeof players.$inferInsert;
export type TokenHoldingRow = typeof tokenHoldings.$inferSelect;
