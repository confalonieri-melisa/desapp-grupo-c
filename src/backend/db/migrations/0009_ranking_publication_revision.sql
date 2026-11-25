CREATE TABLE "ranking_publication_revision" (
	"id" integer PRIMARY KEY NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "chk_ranking_publication_revision_singleton" CHECK ("ranking_publication_revision"."id" = 1)
);
--> statement-breakpoint
INSERT INTO "ranking_publication_revision" ("id", "revision")
SELECT 1, COUNT(*)
FROM "batch_turns"
WHERE "status" IN ('COMPLETED', 'PARTIAL') AND "succeeded_count" > 0;
