CREATE TABLE "p2p_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "chk_p2p_offer_quantity" CHECK ("p2p_offers"."quantity" > 0),
	CONSTRAINT "chk_p2p_offer_price" CHECK ("p2p_offers"."unit_price" > 0),
	CONSTRAINT "chk_p2p_offer_status" CHECK ("p2p_offers"."status" in ('OPEN', 'FILLED', 'CANCELLED'))
);
--> statement-breakpoint
ALTER TABLE "p2p_offers" ADD CONSTRAINT "p2p_offers_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "p2p_offers" ADD CONSTRAINT "p2p_offers_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_p2p_offers_status_player_date" ON "p2p_offers" USING btree ("status","player_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_p2p_offers_seller_status_date" ON "p2p_offers" USING btree ("seller_id","status","created_at");
--> statement-breakpoint
ALTER TABLE "market_operations" ALTER COLUMN "quote_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "market_operations" ADD COLUMN "buyer_id" uuid;
--> statement-breakpoint
ALTER TABLE "market_operations" ADD COLUMN "seller_id" uuid;
--> statement-breakpoint
ALTER TABLE "market_operations" ADD COLUMN "offer_id" uuid;
--> statement-breakpoint
ALTER TABLE "market_operations" ADD CONSTRAINT "market_operations_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "market_operations" ADD CONSTRAINT "market_operations_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "market_operations" ADD CONSTRAINT "market_operations_offer_id_p2p_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."p2p_offers"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_market_operations_buyer_date" ON "market_operations" USING btree ("buyer_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_market_operations_seller_date" ON "market_operations" USING btree ("seller_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_market_operations_offer" ON "market_operations" USING btree ("offer_id");
--> statement-breakpoint
ALTER TABLE "financial_audit_records" DROP CONSTRAINT "chk_financial_audit_action";
--> statement-breakpoint
ALTER TABLE "financial_audit_records" ADD CONSTRAINT "chk_financial_audit_action" CHECK ("financial_audit_records"."action" in ('TOKEN_BUY', 'TOKEN_SELL', 'P2P_TRADE'));
