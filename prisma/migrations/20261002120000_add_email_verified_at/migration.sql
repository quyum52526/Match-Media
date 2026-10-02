-- Email OTP gate: timestamp column + grandfathering for existing accounts.
--
-- Hand-written like the other migrations here, and additive only.

-- 1. When the email OTP was accepted. `isEmailVerified` stays the flag every
--    gate reads; this is the audit trail behind it.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

-- 2. Grandfather the accounts that already exist.
--
--    Registration now blocks onboarding until the emailed code is entered, and
--    the gate reads `isEmailVerified` — which has been false for everyone,
--    because nothing ever set it. Without this backfill, shipping the gate
--    would lock every current member out of onboarding and (for agencies and
--    agents) their dashboard, over a code they were never sent. The gate is a
--    signup step, so it applies from here forward; accounts that predate it
--    keep their access and can still verify from the Verification Center.
--
--    `emailVerifiedAt` is deliberately left NULL for these rows: nobody proved
--    anything, so there is no honest timestamp to record, and NULL keeps them
--    distinguishable from accounts that actually completed the OTP.
UPDATE "User" SET "isEmailVerified" = TRUE WHERE "isEmailVerified" = FALSE;
