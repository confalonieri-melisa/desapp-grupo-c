-- Load only into an isolated, migrated acceptance database.
INSERT INTO players (id,source,external_id,name,team,league,position,statistics) VALUES
('00000000-0000-4000-8000-000000000801','WHOSCORED','acceptance-a','Jugador A','Example FC','PREMIER_LEAGUE','FORWARD','{"goals":5}'),
('00000000-0000-4000-8000-000000000802','WHOSCORED','acceptance-b','Jugador B','Example FC','PREMIER_LEAGUE','FORWARD','{"goals":0}');
INSERT INTO valuation_strategy_versions (id,strategy_code,version,configuration) VALUES
('00000000-0000-4000-8000-000000000811','CUSTOM_STRATEGY','1.0.0','{}');
INSERT INTO player_quotes (id,player_id,strategy_version_id,individual_score,team_score,final_score,quote_value,calculated_at,explanation) VALUES
('00000000-0000-4000-8000-000000000812','00000000-0000-4000-8000-000000000801','00000000-0000-4000-8000-000000000811',0,NULL,0,10.00,'2026-10-20 10:02:03.123456+00','{"contributions":[{"metric":"goals","value":0,"enabled":false,"range":[0,1],"missing":null}],"empty":{}}'),
('00000000-0000-4000-8000-000000000813','00000000-0000-4000-8000-000000000801','00000000-0000-4000-8000-000000000811',0.5,NULL,0.5,50.00,'2026-10-20 10:02:03.123456+00','{"individual":[{"metric":"goals","value":0}],"team":[]}'),
('00000000-0000-4000-8000-000000000814','00000000-0000-4000-8000-000000000801','00000000-0000-4000-8000-000000000811',0.3,NULL,0.3,30.00,'2026-10-19 12:00:00+00','{"individual":[]}');
