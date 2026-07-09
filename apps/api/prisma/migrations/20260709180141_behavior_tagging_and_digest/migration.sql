-- CreateEnum
CREATE TYPE "BehaviorTag" AS ENUM ('ATTENTIVE', 'DISRUPTIVE', 'SLEEPING', 'BULLYING_FLAG');

-- CreateEnum
CREATE TYPE "BehaviorAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED');

-- AlterEnum
ALTER TYPE "NotificationTrigger" ADD VALUE 'END_OF_DAY_DIGEST';

-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN     "behaviorComment" TEXT,
ADD COLUMN     "behaviorTag" "BehaviorTag";

-- CreateTable
CREATE TABLE "BehaviorAlert" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classUnitId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "attendanceRecordId" TEXT NOT NULL,
    "comment" TEXT,
    "status" "BehaviorAlertStatus" NOT NULL DEFAULT 'OPEN',
    "raisedByUserId" TEXT NOT NULL,
    "acknowledgedByUserId" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BehaviorAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BehaviorAlert_classUnitId_status_idx" ON "BehaviorAlert"("classUnitId", "status");

-- AddForeignKey
ALTER TABLE "BehaviorAlert" ADD CONSTRAINT "BehaviorAlert_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorAlert" ADD CONSTRAINT "BehaviorAlert_classUnitId_fkey" FOREIGN KEY ("classUnitId") REFERENCES "ClassUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorAlert" ADD CONSTRAINT "BehaviorAlert_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorAlert" ADD CONSTRAINT "BehaviorAlert_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "AttendanceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorAlert" ADD CONSTRAINT "BehaviorAlert_raisedByUserId_fkey" FOREIGN KEY ("raisedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorAlert" ADD CONSTRAINT "BehaviorAlert_acknowledgedByUserId_fkey" FOREIGN KEY ("acknowledgedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
