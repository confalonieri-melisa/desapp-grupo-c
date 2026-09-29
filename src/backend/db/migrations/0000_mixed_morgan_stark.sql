CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(50) NOT NULL,
	"external_id" varchar(100) NOT NULL,
	"name" varchar(150) NOT NULL,
	"team" varchar(100) NOT NULL,
	"league" varchar(50) NOT NULL,
	"position" varchar(30) NOT NULL,
	"statistics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"average_purchase_price" numeric(10, 2) DEFAULT '1.00' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_token_holdings_quantity_non_negative" CHECK ("token_holdings"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(150) NOT NULL,
	"role" varchar(20) DEFAULT 'INVESTOR' NOT NULL,
	"credit_balance" numeric(12, 2) DEFAULT '1000.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "token_holdings" ADD CONSTRAINT "token_holdings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_holdings" ADD CONSTRAINT "token_holdings_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_players_source_external_id" ON "players" USING btree ("source","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_player_holding" ON "token_holdings" USING btree ("user_id","player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email" ON "users" USING btree ("email");