-- CreateEnum
CREATE TYPE "AgencyVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING_APPROVAL', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "agencyLogo"               TEXT,
ADD COLUMN "tradeLicenseUrl"          TEXT,
ADD COLUMN "agencyVerificationStatus" "AgencyVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';
