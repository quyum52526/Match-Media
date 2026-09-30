-- AlterTable: religion / community + lifestyle attributes (all nullable, so
-- existing rows need no backfill).
ALTER TABLE "Profile" ADD COLUMN     "religion" TEXT,
                      ADD COLUMN     "sect" TEXT,
                      ADD COLUMN     "caste" TEXT,
                      ADD COLUMN     "smokingStatus" TEXT,
                      ADD COLUMN     "diet" TEXT;

-- CreateIndex
CREATE INDEX "Profile_gender_religion_idx" ON "Profile"("gender", "religion");

-- CreateTable
CREATE TABLE "PartnerPreference" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "minHeight" TEXT,
    "maxHeight" TEXT,
    "religions" TEXT[],
    "sects" TEXT[],
    "districts" TEXT[],
    "professions" TEXT[],
    "educations" TEXT[],
    "maritalStatuses" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPreference_profileId_key" ON "PartnerPreference"("profileId");

-- AddForeignKey
ALTER TABLE "PartnerPreference" ADD CONSTRAINT "PartnerPreference_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
