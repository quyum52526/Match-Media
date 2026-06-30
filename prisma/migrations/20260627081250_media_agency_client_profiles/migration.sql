-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "managedByAgency" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "userId" DROP NOT NULL;
