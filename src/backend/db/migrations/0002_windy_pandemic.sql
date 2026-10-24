CREATE TABLE "competition_context_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"context_update_id" uuid NOT NULL,
	"league" varchar(50) NOT NULL,
	"season" integer NOT NULL,
	"source_data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competition_context_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season" integer NOT NULL,
	"requested_by" uuid,
	"status" varchar(20) NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"error_summary" jsonb
);
--> statement-breakpoint
CREATE TABLE "team_competition_standings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"context_update_id" uuid NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"league" varchar(50) NOT NULL,
	"season" integer NOT NULL,
	"team_external_id" varchar(100) NOT NULL,
	"team_name" varchar(150) NOT NULL,
	"position" integer NOT NULL,
	"played_games" integer NOT NULL,
	"points" integer NOT NULL,
	"goal_difference" integer NOT NULL,
	CONSTRAINT "chk_context_standing_position_nonnegative" CHECK ("team_competition_standings"."position" >= 0),
	CONSTRAINT "chk_context_standing_played_nonnegative" CHECK ("team_competition_standings"."played_games" >= 0),
	CONSTRAINT "chk_context_standing_points_nonnegative" CHECK ("team_competition_standings"."points" >= 0)
);
--> statement-breakpoint
CREATE TABLE "team_source_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league" varchar(50) NOT NULL,
	"season" integer NOT NULL,
	"whoscored_team_name" varchar(150) NOT NULL,
	"football_data_team_external_id" varchar(100) NOT NULL,
	"football_data_team_name" varchar(150) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competition_context_snapshots" ADD CONSTRAINT "competition_context_snapshots_context_update_id_competition_context_updates_id_fk" FOREIGN KEY ("context_update_id") REFERENCES "public"."competition_context_updates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_context_updates" ADD CONSTRAINT "competition_context_updates_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_competition_standings" ADD CONSTRAINT "team_competition_standings_context_update_id_competition_context_updates_id_fk" FOREIGN KEY ("context_update_id") REFERENCES "public"."competition_context_updates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_competition_standings" ADD CONSTRAINT "team_competition_standings_snapshot_id_competition_context_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."competition_context_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_context_snapshot_update_league" ON "competition_context_snapshots" USING btree ("context_update_id","league");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_context_standing_update_league_team" ON "team_competition_standings" USING btree ("context_update_id","league","team_external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_team_source_link_whoscored" ON "team_source_links" USING btree ("league","season","whoscored_team_name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_team_source_link_football_data" ON "team_source_links" USING btree ("league","season","football_data_team_external_id");
