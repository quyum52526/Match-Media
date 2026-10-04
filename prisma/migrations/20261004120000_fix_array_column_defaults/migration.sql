-- Restore the empty-array defaults on the two scalar-list columns added with
-- the multi-role work.
--
-- WHAT BROKE: both columns are NOT NULL with NO default. Prisma omits a scalar
-- list from the INSERT when the field is absent and the model declares no
-- `@default([])`, so Postgres had nothing to substitute and every insert hit
-- "Null constraint violation on the fields: (agentDistricts)". Because the
-- column is on User, that took out EVERY user creation — public registration
-- included, not just the admin's manual intake form.
--
-- WHY THE ORIGINAL MIGRATION DID NOT COVER IT: it used
-- `ADD COLUMN IF NOT EXISTS ... NOT NULL DEFAULT ARRAY[]::TEXT[]`. The columns
-- already existed (created by a `prisma db push`, whose generated DDL for a
-- String[] is `NOT NULL` with no default), so IF NOT EXISTS skipped the whole
-- clause — default included — and did it silently. That is the trap in
-- IF NOT EXISTS: it guards the column, not the column's definition.
--
-- The matching `@default([])` is now in schema.prisma as well, so Prisma sends
-- an empty array itself rather than relying on the database to fill the gap.

ALTER TABLE "User"
  ALTER COLUMN "agentDistricts" SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "AgentApplication"
  ALTER COLUMN "operatingDistricts" SET DEFAULT ARRAY[]::TEXT[];
