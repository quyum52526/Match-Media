-- Structured family, relative and career fields on Profile.
--
-- Photos and names are often masked on this platform, so matches evaluate on
-- family and career. These columns replace the single free-text
-- "familyDetails" blurb as the place that data is written; the blurb itself
-- stays as the optional "anything else" note (and still holds everything for
-- profiles written before this migration).
--
-- All columns are nullable with no default, so this is additive and safe to
-- apply to the live database: existing rows get NULLs and render as before.
-- Hand-written to match the other migrations in this directory; IF NOT EXISTS
-- keeps a re-run harmless.

ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "fatherProfession"   TEXT,
  ADD COLUMN IF NOT EXISTS "fatherStatus"       TEXT,
  ADD COLUMN IF NOT EXISTS "motherProfession"   TEXT,
  ADD COLUMN IF NOT EXISTS "motherStatus"       TEXT,
  ADD COLUMN IF NOT EXISTS "numberOfBrothers"   INTEGER,
  ADD COLUMN IF NOT EXISTS "brothersDetails"    TEXT,
  ADD COLUMN IF NOT EXISTS "numberOfSisters"    INTEGER,
  ADD COLUMN IF NOT EXISTS "sistersDetails"     TEXT,
  ADD COLUMN IF NOT EXISTS "paternalBackground" TEXT,
  ADD COLUMN IF NOT EXISTS "maternalBackground" TEXT,
  ADD COLUMN IF NOT EXISTS "familyClass"        TEXT,
  ADD COLUMN IF NOT EXISTS "familyType"         TEXT,
  ADD COLUMN IF NOT EXISTS "educationInstitute" TEXT,
  ADD COLUMN IF NOT EXISTS "educationMajor"     TEXT;
