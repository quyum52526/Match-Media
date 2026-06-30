-- CreateEnum
CREATE TYPE "AccountCategory" AS ENUM ('SELF', 'PARENTS', 'MEDIA', 'AGENT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountCategory" "AccountCategory",
ADD COLUMN     "agencyDistrict" TEXT,
ADD COLUMN     "agencyName" TEXT,
ADD COLUMN     "contactPerson" TEXT;
