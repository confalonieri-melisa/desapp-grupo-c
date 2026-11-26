CREATE INDEX "idx_player_quotes_strategy_player_date" ON "player_quotes" USING btree ("strategy_version_id", "player_id", "calculated_at" DESC, "id" DESC);
