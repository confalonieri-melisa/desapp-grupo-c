ALTER TABLE "token_holdings" ADD COLUMN "reserved_quantity" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "token_holdings" ADD CONSTRAINT "chk_token_holdings_reserved_quantity_non_negative" CHECK ("token_holdings"."reserved_quantity" >= 0);
--> statement-breakpoint
UPDATE "token_holdings" holding
SET "reserved_quantity" = COALESCE((
  SELECT SUM(offer."quantity")
  FROM "p2p_offers" offer
  WHERE offer."seller_id" = holding."user_id"
    AND offer."player_id" = holding."player_id"
    AND offer."status" = 'OPEN'
), 0)::integer;
