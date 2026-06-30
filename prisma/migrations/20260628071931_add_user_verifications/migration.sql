-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'NID_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'NID_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'SELFIE_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'SELFIE_REJECTED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "nidBackKey" TEXT,
ADD COLUMN     "nidFrontKey" TEXT,
ADD COLUMN     "nidReviewNote" TEXT,
ADD COLUMN     "nidVerificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "selfieKey" TEXT,
ADD COLUMN     "selfieReviewNote" TEXT,
ADD COLUMN     "selfieVerificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';
