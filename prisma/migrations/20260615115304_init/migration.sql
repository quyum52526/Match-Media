-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GENERAL', 'GUARDIAN', 'MEDIA', 'AGENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "ImagePrivacy" AS ENUM ('BLURRED', 'PUBLIC');

-- CreateEnum
CREATE TYPE "PhotoAccessStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'REVOKED');

-- CreateEnum
CREATE TYPE "InterestStatus" AS ENUM ('SENT', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'VERIFIED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'GENERAL',
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "mobile" TEXT,
    "isMobileVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT,
    "gender" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "district" TEXT,
    "upazila" TEXT,
    "profession" TEXT,
    "education" TEXT,
    "maritalStatus" TEXT,
    "bio" TEXT,
    "height" TEXT,
    "weight" TEXT,
    "childrenStatus" TEXT,
    "familyDetails" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "nameHidden" BOOLEAN NOT NULL DEFAULT false,
    "completionScore" INTEGER NOT NULL DEFAULT 10,
    "referredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileImage" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "privacy" "ImagePrivacy" NOT NULL DEFAULT 'BLURRED',
    "originalKey" TEXT NOT NULL,
    "blurredKey" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoAccessRequest" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" "PhotoAccessStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "PhotoAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "InterestStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WardDetails" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "targetMetrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WardDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetProfileId" TEXT NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'PENDING',
    "agentShare" INTEGER NOT NULL,
    "adminShare" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "subscriptionModeActive" BOOLEAN NOT NULL DEFAULT false,
    "visibilityFloorPercent" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileViewLog" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "viewedProfileId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileViewLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Profile_referredById_idx" ON "Profile"("referredById");

-- CreateIndex
CREATE INDEX "Profile_district_upazila_idx" ON "Profile"("district", "upazila");

-- CreateIndex
CREATE INDEX "ProfileImage_profileId_idx" ON "ProfileImage"("profileId");

-- CreateIndex
CREATE INDEX "PhotoAccessRequest_ownerId_status_idx" ON "PhotoAccessRequest"("ownerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoAccessRequest_viewerId_ownerId_key" ON "PhotoAccessRequest"("viewerId", "ownerId");

-- CreateIndex
CREATE INDEX "Interest_receiverId_status_idx" ON "Interest"("receiverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Interest_senderId_receiverId_key" ON "Interest"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "WardDetails_guardianId_idx" ON "WardDetails"("guardianId");

-- CreateIndex
CREATE INDEX "ServiceRequest_agentId_status_idx" ON "ServiceRequest"("agentId", "status");

-- CreateIndex
CREATE INDEX "ServiceRequest_requesterId_idx" ON "ServiceRequest"("requesterId");

-- CreateIndex
CREATE INDEX "ProfileViewLog_viewedProfileId_date_idx" ON "ProfileViewLog"("viewedProfileId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileViewLog_viewerId_viewedProfileId_date_key" ON "ProfileViewLog"("viewerId", "viewedProfileId", "date");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileImage" ADD CONSTRAINT "ProfileImage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoAccessRequest" ADD CONSTRAINT "PhotoAccessRequest_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoAccessRequest" ADD CONSTRAINT "PhotoAccessRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WardDetails" ADD CONSTRAINT "WardDetails_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_targetProfileId_fkey" FOREIGN KEY ("targetProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileViewLog" ADD CONSTRAINT "ProfileViewLog_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileViewLog" ADD CONSTRAINT "ProfileViewLog_viewedProfileId_fkey" FOREIGN KEY ("viewedProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
