-- CreateEnum
CREATE TYPE "DismissalType" AS ENUM ('PICKUP', 'SELF_DISMISSED');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('OPEN', 'RESOLVED');

-- AlterEnum
ALTER TYPE "NotificationTrigger" ADD VALUE 'DISMISSAL_CONFIRMED';

-- AlterTable
ALTER TABLE "NotificationLog" ADD COLUMN     "dismissalRecordId" TEXT;

-- CreateTable
CREATE TABLE "AuthorizedPickupPerson" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "addedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthorizedPickupPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DismissalRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classUnitId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "DismissalType" NOT NULL,
    "guardianId" TEXT,
    "oneOffPickupPersonId" TEXT,
    "pickedUpByName" TEXT,
    "pickedUpByRelationship" TEXT,
    "loggedByUserId" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DismissalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DismissalEscalation" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classUnitId" TEXT NOT NULL,
    "attemptedPickupPersonName" TEXT NOT NULL,
    "attemptedPickupPersonPhone" TEXT,
    "note" TEXT,
    "status" "EscalationStatus" NOT NULL DEFAULT 'OPEN',
    "reportedByUserId" TEXT NOT NULL,
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DismissalEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthorizedPickupPerson_studentId_date_idx" ON "AuthorizedPickupPerson"("studentId", "date");

-- CreateIndex
CREATE INDEX "DismissalRecord_classUnitId_date_idx" ON "DismissalRecord"("classUnitId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DismissalRecord_studentId_date_key" ON "DismissalRecord"("studentId", "date");

-- CreateIndex
CREATE INDEX "DismissalEscalation_classUnitId_status_idx" ON "DismissalEscalation"("classUnitId", "status");

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_dismissalRecordId_fkey" FOREIGN KEY ("dismissalRecordId") REFERENCES "DismissalRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizedPickupPerson" ADD CONSTRAINT "AuthorizedPickupPerson_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizedPickupPerson" ADD CONSTRAINT "AuthorizedPickupPerson_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DismissalRecord" ADD CONSTRAINT "DismissalRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DismissalRecord" ADD CONSTRAINT "DismissalRecord_classUnitId_fkey" FOREIGN KEY ("classUnitId") REFERENCES "ClassUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DismissalRecord" ADD CONSTRAINT "DismissalRecord_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DismissalRecord" ADD CONSTRAINT "DismissalRecord_oneOffPickupPersonId_fkey" FOREIGN KEY ("oneOffPickupPersonId") REFERENCES "AuthorizedPickupPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DismissalRecord" ADD CONSTRAINT "DismissalRecord_loggedByUserId_fkey" FOREIGN KEY ("loggedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DismissalEscalation" ADD CONSTRAINT "DismissalEscalation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DismissalEscalation" ADD CONSTRAINT "DismissalEscalation_classUnitId_fkey" FOREIGN KEY ("classUnitId") REFERENCES "ClassUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DismissalEscalation" ADD CONSTRAINT "DismissalEscalation_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DismissalEscalation" ADD CONSTRAINT "DismissalEscalation_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
