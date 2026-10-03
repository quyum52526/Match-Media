-- AlterTable
ALTER TABLE "AgentApplication" ALTER COLUMN "operatingDistricts" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "agentDistricts" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Profile_isFeatured_idx" ON "Profile"("isFeatured");
