CREATE TABLE "batch_turns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process" varchar(30) NOT NULL,
	"origin" varchar(20) NOT NULL,
	"scheduled_local" varchar(32) NOT NULL,
	"timezone" varchar(100) NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"correlation_id" varchar(100) NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"succeeded_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"reason_code" varchar(80)
);
--> statement-breakpoint
ALTER TABLE "player_quotes" ADD COLUMN "turn_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_batch_turn_scheduled_process_time" ON "batch_turns" USING btree ("process","scheduled_for") WHERE "batch_turns"."origin" = 'SCHEDULED';--> statement-breakpoint
CREATE INDEX "idx_batch_turn_status_process" ON "batch_turns" USING btree ("status","process");--> statement-breakpoint
ALTER TABLE "player_quotes" ADD CONSTRAINT "player_quotes_turn_id_batch_turns_id_fk" FOREIGN KEY ("turn_id") REFERENCES "public"."batch_turns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_player_quotes_turn_player" ON "player_quotes" USING btree ("turn_id","player_id") WHERE "player_quotes"."turn_id" is not null;