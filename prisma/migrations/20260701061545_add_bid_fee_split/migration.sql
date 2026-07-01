-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "agentShare" INTEGER,
ADD COLUMN     "platformFee" INTEGER;

-- Backfill existing rows: platformFee = 20% of bidAmount, agentShare = remainder
UPDATE "JobApplication"
SET "platformFee" = ROUND("bidAmount" * 0.2),
    "agentShare" = "bidAmount" - ROUND("bidAmount" * 0.2);

-- Now enforce NOT NULL
ALTER TABLE "JobApplication" ALTER COLUMN "agentShare" SET NOT NULL,
ALTER COLUMN "platformFee" SET NOT NULL;
