CREATE TABLE "player_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"strategy_version_id" uuid NOT NULL,
	"individual_score" numeric(8, 6) NOT NULL,
	"team_score" numeric(8, 6),
	"final_score" numeric(8, 6) NOT NULL,
	"quote_value" numeric(10, 2) NOT NULL,
	"unit" varchar(30) DEFAULT 'CREDIT_PER_TOKEN' NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"context_update_id" uuid,
	"explanation" jsonb NOT NULL,
	CONSTRAINT "chk_player_quote_final_score" CHECK ("player_quotes"."final_score" >= 0 and "player_quotes"."final_score" <= 1),
	CONSTRAINT "chk_player_quote_value" CHECK ("player_quotes"."quote_value" >= 1 and "player_quotes"."quote_value" <= 100)
);
--> statement-breakpoint
CREATE TABLE "valuation_strategy_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strategy_code" varchar(50) NOT NULL,
	"version" varchar(30) NOT NULL,
	"configuration" jsonb NOT NULL,
	"is_active" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	CONSTRAINT "chk_valuation_strategy_active" CHECK ("valuation_strategy_versions"."is_active" in (0, 1))
);
--> statement-breakpoint
ALTER TABLE "player_quotes" ADD CONSTRAINT "player_quotes_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_quotes" ADD CONSTRAINT "player_quotes_strategy_version_id_valuation_strategy_versions_id_fk" FOREIGN KEY ("strategy_version_id") REFERENCES "public"."valuation_strategy_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_quotes" ADD CONSTRAINT "player_quotes_context_update_id_competition_context_updates_id_fk" FOREIGN KEY ("context_update_id") REFERENCES "public"."competition_context_updates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuation_strategy_versions" ADD CONSTRAINT "valuation_strategy_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_player_quotes_player_date" ON "player_quotes" USING btree ("player_id","calculated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_valuation_strategy_version" ON "valuation_strategy_versions" USING btree ("strategy_code","version");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_valuation_active" ON "valuation_strategy_versions" USING btree ("is_active") WHERE "valuation_strategy_versions"."is_active" = 1;