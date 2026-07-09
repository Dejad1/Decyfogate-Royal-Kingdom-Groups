-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationChannel" ADD VALUE 'PUSH';
ALTER TYPE "NotificationChannel" ADD VALUE 'EMAIL';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'GUARDIAN';

-- AlterTable
ALTER TABLE "Guardian" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "preferredChannels" "NotificationChannel"[] DEFAULT ARRAY['SMS', 'WHATSAPP']::"NotificationChannel"[];

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "GuardianDeviceToken" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianDeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuardianDeviceToken_token_key" ON "GuardianDeviceToken"("token");

-- CreateIndex
CREATE INDEX "GuardianDeviceToken_guardianId_idx" ON "GuardianDeviceToken"("guardianId");

-- AddForeignKey
ALTER TABLE "GuardianDeviceToken" ADD CONSTRAINT "GuardianDeviceToken_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
