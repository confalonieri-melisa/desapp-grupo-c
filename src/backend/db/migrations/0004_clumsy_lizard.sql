CREATE TABLE "financial_audit_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"previous_state" jsonb NOT NULL,
	"new_state" jsonb NOT NULL,
	"correlation_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_financial_audit_action" CHECK ("financial_audit_records"."action" in ('TOKEN_BUY', 'TOKEN_SELL'))
);
--> statement-breakpoint
CREATE TABLE "market_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(10) NOT NULL,
	"investor_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"quote_value" numeric(10, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"unit" varchar(30) DEFAULT 'CREDIT_PER_TOKEN' NOT NULL,
	"correlation_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_market_operation_type" CHECK ("market_operations"."type" in ('BUY', 'SELL')),
	CONSTRAINT "chk_market_operation_quantity" CHECK ("market_operations"."quantity" > 0),
	CONSTRAINT "chk_market_operation_quote" CHECK ("market_operations"."quote_value" >= 0),
	CONSTRAINT "chk_market_operation_total" CHECK ("market_operations"."total" > 0)
);
--> statement-breakpoint
ALTER TABLE "financial_audit_records" ADD CONSTRAINT "financial_audit_records_operation_id_market_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."market_operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_audit_records" ADD CONSTRAINT "financial_audit_records_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_operations" ADD CONSTRAINT "market_operations_investor_id_users_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_operations" ADD CONSTRAINT "market_operations_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_operations" ADD CONSTRAINT "market_operations_quote_id_player_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."player_quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_financial_audit_operation" ON "financial_audit_records" USING btree ("operation_id");--> statement-breakpoint
CREATE INDEX "idx_market_operations_investor_date" ON "market_operations" USING btree ("investor_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_market_operations_player_date" ON "market_operations" USING btree ("player_id","created_at");