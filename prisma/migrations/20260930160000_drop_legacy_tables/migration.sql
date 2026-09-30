-- Drop two tables that predate this project and were never in the Prisma schema
-- (leftovers from an earlier portfolio site sharing the same Supabase database).
-- Without this, every `prisma db push` / `migrate diff` proposes dropping them,
-- so the schema could never be cleanly managed.
--
-- Contents were dumped to docs/legacy-cms-backup.json immediately beforehand:
-- cms_entries held 2 rows, portfolio_items was empty. Nothing in MatchMedia
-- reads either table, and neither had inbound foreign keys.
DROP TABLE IF EXISTS "cms_entries";

DROP TABLE IF EXISTS "portfolio_items";
