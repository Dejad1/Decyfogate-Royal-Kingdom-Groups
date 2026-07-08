-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GROUP_ADMIN', 'SCHOOL_ADMIN', 'FORM_TEACHER', 'SUBJECT_TEACHER', 'ONBOARDING_SPECIALIST', 'SUPPORT_AGENT', 'BILLING_MANAGER', 'COMPLIANCE_OFFICER');

-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('NURSERY_PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE');

-- CreateEnum
CREATE TYPE "AttendanceEntryType" AS ENUM ('DAILY_REGISTER', 'SUBJECT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationTrigger" AS ENUM ('ATTENDANCE_MARKED', 'NOT_YET_ARRIVED', 'BROADCAST');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('STARTER', 'GROWTH', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "groupId" TEXT,
    "schoolId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SchoolType" NOT NULL,
    "attendanceCutoffTime" TEXT NOT NULL DEFAULT '08:30',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassLevel" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassUnit" (
    "id" TEXT NOT NULL,
    "classLevelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formTeacherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSubjectTeacher" (
    "id" TEXT NOT NULL,
    "classUnitId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassSubjectTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classUnitId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guardian" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentGuardian" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StudentGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classUnitId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "AttendanceEntryType" NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "subjectId" TEXT,
    "period" TEXT,
    "markedByUserId" TEXT NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "trigger" "NotificationTrigger" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "attendanceRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "seats" INTEGER NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_schoolId_idx" ON "User"("schoolId");

-- CreateIndex
CREATE INDEX "User_groupId_idx" ON "User"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");

-- CreateIndex
CREATE UNIQUE INDEX "School_groupId_name_key" ON "School"("groupId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ClassLevel_schoolId_name_key" ON "ClassLevel"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ClassUnit_classLevelId_name_key" ON "ClassUnit"("classLevelId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_schoolId_name_key" ON "Subject"("schoolId", "name");

-- CreateIndex
CREATE INDEX "ClassSubjectTeacher_teacherId_idx" ON "ClassSubjectTeacher"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSubjectTeacher_classUnitId_subjectId_teacherId_key" ON "ClassSubjectTeacher"("classUnitId", "subjectId", "teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "Term_schoolId_name_key" ON "Term"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Student_admissionNumber_key" ON "Student"("admissionNumber");

-- CreateIndex
CREATE INDEX "Student_classUnitId_idx" ON "Student"("classUnitId");

-- CreateIndex
CREATE INDEX "Student_schoolId_idx" ON "Student"("schoolId");

-- CreateIndex
CREATE INDEX "Guardian_phone_idx" ON "Guardian"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "StudentGuardian_studentId_guardianId_key" ON "StudentGuardian"("studentId", "guardianId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_classUnitId_date_idx" ON "AttendanceRecord"("classUnitId", "date");

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentId_date_idx" ON "AttendanceRecord"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_studentId_date_type_subjectId_key" ON "AttendanceRecord"("studentId", "date", "type", "subjectId");

-- CreateIndex
CREATE INDEX "NotificationLog_studentId_idx" ON "NotificationLog"("studentId");

-- CreateIndex
CREATE INDEX "NotificationLog_status_idx" ON "NotificationLog"("status");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassLevel" ADD CONSTRAINT "ClassLevel_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassUnit" ADD CONSTRAINT "ClassUnit_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "ClassLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassUnit" ADD CONSTRAINT "ClassUnit_formTeacherId_fkey" FOREIGN KEY ("formTeacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubjectTeacher" ADD CONSTRAINT "ClassSubjectTeacher_classUnitId_fkey" FOREIGN KEY ("classUnitId") REFERENCES "ClassUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubjectTeacher" ADD CONSTRAINT "ClassSubjectTeacher_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubjectTeacher" ADD CONSTRAINT "ClassSubjectTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classUnitId_fkey" FOREIGN KEY ("classUnitId") REFERENCES "ClassUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_classUnitId_fkey" FOREIGN KEY ("classUnitId") REFERENCES "ClassUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_markedByUserId_fkey" FOREIGN KEY ("markedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "AttendanceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
