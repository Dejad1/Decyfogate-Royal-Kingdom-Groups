/*
  Warnings:

  - You are about to drop the column `guardianId` on the `DismissalRecord` table. All the data in the column will be lost.
  - You are about to drop the column `loggedAt` on the `DismissalRecord` table. All the data in the column will be lost.
  - You are about to drop the column `loggedByUserId` on the `DismissalRecord` table. All the data in the column will be lost.
  - You are about to drop the column `oneOffPickupPersonId` on the `DismissalRecord` table. All the data in the column will be lost.
  - You are about to drop the column `pickedUpByName` on the `DismissalRecord` table. All the data in the column will be lost.
  - You are about to drop the column `pickedUpByRelationship` on the `DismissalRecord` table. All the data in the column will be lost.
  - You are about to drop the `AuthorizedPickupPerson` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DismissalEscalation` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `confirmedByUserId` to the `DismissalRecord` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AuthorizedPickupPerson" DROP CONSTRAINT "AuthorizedPickupPerson_addedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "AuthorizedPickupPerson" DROP CONSTRAINT "AuthorizedPickupPerson_studentId_fkey";

-- DropForeignKey
ALTER TABLE "DismissalEscalation" DROP CONSTRAINT "DismissalEscalation_classUnitId_fkey";

-- DropForeignKey
ALTER TABLE "DismissalEscalation" DROP CONSTRAINT "DismissalEscalation_reportedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "DismissalEscalation" DROP CONSTRAINT "DismissalEscalation_resolvedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "DismissalEscalation" DROP CONSTRAINT "DismissalEscalation_studentId_fkey";

-- DropForeignKey
ALTER TABLE "DismissalRecord" DROP CONSTRAINT "DismissalRecord_guardianId_fkey";

-- DropForeignKey
ALTER TABLE "DismissalRecord" DROP CONSTRAINT "DismissalRecord_loggedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "DismissalRecord" DROP CONSTRAINT "DismissalRecord_oneOffPickupPersonId_fkey";

-- AlterTable
ALTER TABLE "DismissalRecord" DROP COLUMN "guardianId",
DROP COLUMN "loggedAt",
DROP COLUMN "loggedByUserId",
DROP COLUMN "oneOffPickupPersonId",
DROP COLUMN "pickedUpByName",
DROP COLUMN "pickedUpByRelationship",
ADD COLUMN     "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "confirmedByUserId" TEXT NOT NULL,
ADD COLUMN     "matchedGuardianId" TEXT,
ADD COLUMN     "pickupPersonName" TEXT,
ADD COLUMN     "pickupPersonPhone" TEXT,
ADD COLUMN     "pickupPersonRelationship" TEXT;

-- DropTable
DROP TABLE "AuthorizedPickupPerson";

-- DropTable
DROP TABLE "DismissalEscalation";

-- DropEnum
DROP TYPE "EscalationStatus";

-- AddForeignKey
ALTER TABLE "DismissalRecord" ADD CONSTRAINT "DismissalRecord_matchedGuardianId_fkey" FOREIGN KEY ("matchedGuardianId") REFERENCES "Guardian"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DismissalRecord" ADD CONSTRAINT "DismissalRecord_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
