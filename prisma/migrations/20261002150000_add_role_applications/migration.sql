-- Multi-role architecture: a member can apply to ALSO operate as a marriage
-- media agency or as a verification agent, from the login they already have.
--
-- Hand-written like the other migrations here, and additive only: new enum,
-- two new tables, three new nullable/defaulted User columns. Nothing existing
-- is altered or dropped, and `role` keeps its current meaning (the account's
-- primary identity and the admin gate).

-- 1. Review state of an application.
DO $$
BEGIN
  CREATE TYPE "RoleApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Approved secondary roles on the User, plus an agent's covered districts.
--    `agentDistricts` defaults to an empty array so existing rows are valid
--    without a backfill.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "hasAgency"      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "hasAgentRole"   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "agentDistricts" TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[];

-- 3. Applications. Documents are storage keys in the private
--    "verification-docs" bucket, signed at read time — never public URLs.
CREATE TABLE IF NOT EXISTS "AgencyApplication" (
  "id"                      TEXT NOT NULL,
  "userId"                  TEXT NOT NULL,
  "agencyName"              TEXT NOT NULL,
  "tradeLicenseNumber"      TEXT NOT NULL,
  "tradeLicenseDocumentKey" TEXT NOT NULL,
  "officeAddress"           TEXT NOT NULL,
  "contactPerson"           TEXT NOT NULL,
  "status"                  "RoleApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "rejectionReason"         TEXT,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt"              TIMESTAMP(3),
  "reviewedById"            TEXT,
  CONSTRAINT "AgencyApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AgentApplication" (
  "id"                    TEXT NOT NULL,
  "userId"                TEXT NOT NULL,
  "nidNumber"             TEXT NOT NULL,
  "nidFrontKey"           TEXT NOT NULL,
  "nidBackKey"            TEXT NOT NULL,
  "policeVerificationKey" TEXT,
  "operatingDistricts"    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status"                "RoleApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "rejectionReason"       TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt"            TIMESTAMP(3),
  "reviewedById"          TEXT,
  CONSTRAINT "AgentApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AgencyApplication_userId_idx" ON "AgencyApplication"("userId");
CREATE INDEX IF NOT EXISTS "AgencyApplication_status_idx" ON "AgencyApplication"("status");
CREATE INDEX IF NOT EXISTS "AgentApplication_userId_idx"  ON "AgentApplication"("userId");
CREATE INDEX IF NOT EXISTS "AgentApplication_status_idx"  ON "AgentApplication"("status");

-- 4. Cascade with the applicant: deleting an account removes its applications.
DO $$
BEGIN
  ALTER TABLE "AgencyApplication"
    ADD CONSTRAINT "AgencyApplication_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "AgentApplication"
    ADD CONSTRAINT "AgentApplication_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 5. Accounts that ALREADY are an agency or an agent keep their dashboard
--    through the new flags, so the context switcher and the /agency and /agent
--    routes work for them without them re-applying for what they already have.
UPDATE "User" SET "hasAgency"    = TRUE WHERE "role" = 'MEDIA' AND "hasAgency"    = FALSE;
UPDATE "User" SET "hasAgentRole" = TRUE WHERE "role" = 'AGENT' AND "hasAgentRole" = FALSE;
