-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'VERIFIED', 'CANCELLED');

-- CreateTable
CREATE TABLE "VerificationAssignment" (
    "id" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "agentNote" TEXT,
    "totalFee" INTEGER NOT NULL DEFAULT 250000,
    "agentShare" INTEGER NOT NULL DEFAULT 200000,
    "platformFee" INTEGER NOT NULL DEFAULT 50000,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationAssignment_profileId_key" ON "VerificationAssignment"("profileId");

-- CreateIndex
CREATE INDEX "VerificationAssignment_agentId_status_idx" ON "VerificationAssignment"("agentId", "status");

-- CreateIndex
CREATE INDEX "VerificationAssignment_assignedById_idx" ON "VerificationAssignment"("assignedById");

-- AddForeignKey
ALTER TABLE "VerificationAssignment" ADD CONSTRAINT "VerificationAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationAssignment" ADD CONSTRAINT "VerificationAssignment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationAssignment" ADD CONSTRAINT "VerificationAssignment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
