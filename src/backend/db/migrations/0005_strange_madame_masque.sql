CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key" varchar(255) NOT NULL,
	"player_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"response_body" jsonb
);
--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_idempotency_user_key" ON "idempotency_keys" USING btree ("user_id","key");
--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "chk_idempotency_quantity" CHECK ("idempotency_keys"."quantity" > 0);
