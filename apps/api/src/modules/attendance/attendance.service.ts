import {
  AttendanceEntryType,
  AttendanceReportQuery,
  AttendanceReportRow,
  AttendanceStatus,
  LowAttendanceFlagDto,
  Role,
} from "@decyfogate/shared-types";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { AuthTokenPayload } from "../../lib/jwt";
import * as notificationsService from "../notifications/notifications.service";

function toDateOnly(iso: string) {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export interface MarkAttendanceInput {
  studentId: string;
  classUnitId: string;
  date: string;
  status: AttendanceStatus;
  type: AttendanceEntryType;
  subjectId?: string;
  period?: string;
}

async function assertMarkingAuthority(actor: AuthTokenPayload, input: MarkAttendanceInput) {
  const unit = await prisma.classUnit.findUnique({
    where: { id: input.classUnitId },
    include: { classLevel: { include: { school: true } } },
  });
  if (!unit) throw new HttpError(404, "Class unit not found");

  const isAdminOverride =
    (actor.role === Role.SCHOOL_ADMIN && actor.schoolId === unit.classLevel.schoolId) ||
    (actor.role === Role.GROUP_ADMIN && actor.groupId === unit.classLevel.school.groupId);

  if (input.type === AttendanceEntryType.DAILY_REGISTER) {
    const isFormTeacher = actor.role === Role.FORM_TEACHER && unit.formTeacherId === actor.sub;
    if (!isFormTeacher && !isAdminOverride) {
      throw new HttpError(403, "Only this unit's Form Teacher (or a school admin) can mark the daily register");
    }
  } else {
    if (!input.subjectId) throw new HttpError(400, "subjectId is required for subject-level attendance");
    const isLinkedSubjectTeacher =
      actor.role === Role.SUBJECT_TEACHER &&
      (await prisma.classSubjectTeacher.findFirst({
        where: { classUnitId: input.classUnitId, subjectId: input.subjectId, teacherId: actor.sub },
      }));
    if (!isLinkedSubjectTeacher && !isAdminOverride) {
      throw new HttpError(403, "You are not linked to teach this subject for this class unit");
    }
  }

  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student || student.classUnitId !== input.classUnitId) {
    throw new HttpError(400, "Student does not belong to this class unit");
  }

  return { unit, school: unit.classLevel.school, student };
}

export async function markAttendance(actor: AuthTokenPayload, input: MarkAttendanceInput) {
  const { school, student } = await assertMarkingAuthority(actor, input);
  const date = toDateOnly(input.date);
  const subjectId = input.type === AttendanceEntryType.SUBJECT ? input.subjectId! : null;

  // Application-level idempotent upsert: Postgres composite-unique indexes
  // treat NULLs as distinct, so a plain DB upsert would not reliably block
  // a second DAILY_REGISTER mark for the same student/day (subjectId is
  // always NULL there). Doing find-then-write here plus a partial unique
  // index in the migration (see 'attendance_daily_register_unique') covers
  // both the common path and the concurrent-write edge case.
  const existing = await prisma.attendanceRecord.findFirst({
    where: { studentId: input.studentId, date, type: input.type, subjectId },
  });

  const record = existing
    ? await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { status: input.status, markedByUserId: actor.sub, markedAt: new Date(), period: input.period },
      })
    : await prisma.attendanceRecord.create({
        data: {
          studentId: input.studentId,
          classUnitId: input.classUnitId,
          date,
          type: input.type,
          status: input.status,
          subjectId,
          period: input.period,
          markedByUserId: actor.sub,
        },
      });

  // Only the Form Teacher's daily register notifies guardians -- a parent
  // should not get a separate ping every time a different subject teacher
  // takes attendance through the day (see build brief section 4.1).
  if (input.type === AttendanceEntryType.DAILY_REGISTER) {
    await notificationsService.queueAttendanceNotification({
      studentId: student.id,
      studentName: student.fullName,
      schoolName: school.name,
      status: input.status,
      attendanceRecordId: record.id,
    });
  }

  return record;
}

async function assertReadAccessToUnit(actor: AuthTokenPayload, classUnitId: string) {
  const unit = await prisma.classUnit.findUnique({
    where: { id: classUnitId },
    include: { classLevel: { include: { school: true } } },
  });
  if (!unit) throw new HttpError(404, "Class unit not found");

  if (actor.role === Role.GROUP_ADMIN) return unit;
  if (actor.role === Role.SCHOOL_ADMIN) {
    if (actor.schoolId !== unit.classLevel.schoolId) throw new HttpError(403, "Not your school");
    return unit;
  }
  if (actor.role === Role.FORM_TEACHER) {
    if (unit.formTeacherId !== actor.sub) throw new HttpError(403, "Not your class unit");
    return unit;
  }
  if (actor.role === Role.SUBJECT_TEACHER) {
    const link = await prisma.classSubjectTeacher.findFirst({ where: { classUnitId, teacherId: actor.sub } });
    if (!link) throw new HttpError(403, "You are not linked to teach this class unit");
    return unit;
  }
  throw new HttpError(403, "Forbidden");
}

export async function getTodayAttendance(actor: AuthTokenPayload, classUnitId: string) {
  await assertReadAccessToUnit(actor, classUnitId);
  const today = toDateOnly(new Date().toISOString());
  return prisma.attendanceRecord.findMany({
    where: { classUnitId, date: today },
  });
}

function scopeWhereClause(actor: AuthTokenPayload, query: AttendanceReportQuery) {
  const where: Record<string, unknown> = {
    date: { gte: toDateOnly(query.from), lte: toDateOnly(query.to) },
    type: AttendanceEntryType.DAILY_REGISTER,
  };
  if (query.studentId) where.studentId = query.studentId;
  if (query.classUnitId) where.classUnitId = query.classUnitId;

  const schoolId = query.schoolId ?? actor.schoolId ?? undefined;
  if (actor.role !== Role.GROUP_ADMIN && !schoolId) {
    throw new HttpError(400, "schoolId is required");
  }
  if (schoolId) {
    where.student = { schoolId };
  }
  return where;
}

export async function getAttendanceReport(
  actor: AuthTokenPayload,
  query: AttendanceReportQuery
): Promise<AttendanceReportRow[]> {
  const where = scopeWhereClause(actor, query);
  const records = await prisma.attendanceRecord.findMany({
    where,
    include: { student: { include: { classUnit: { include: { classLevel: true } } } } },
  });

  const byStudent = new Map<string, AttendanceReportRow>();
  for (const record of records) {
    const key = record.studentId;
    if (!byStudent.has(key)) {
      byStudent.set(key, {
        studentId: record.studentId,
        studentName: record.student.fullName,
        classUnitName: `${record.student.classUnit.classLevel.name}${record.student.classUnit.name}`,
        daysPresent: 0,
        daysAbsent: 0,
        daysLate: 0,
        totalDays: 0,
        attendancePercentage: 0,
      });
    }
    const row = byStudent.get(key)!;
    row.totalDays += 1;
    if (record.status === AttendanceStatus.PRESENT) row.daysPresent += 1;
    else if (record.status === AttendanceStatus.ABSENT) row.daysAbsent += 1;
    else if (record.status === AttendanceStatus.LATE) row.daysLate += 1;
  }

  for (const row of byStudent.values()) {
    const attendedDays = row.daysPresent + row.daysLate;
    row.attendancePercentage = row.totalDays === 0 ? 0 : Math.round((attendedDays / row.totalDays) * 1000) / 10;
  }

  return Array.from(byStudent.values()).sort((a, b) => a.studentName.localeCompare(b.studentName));
}

export async function getLowAttendanceFlags(actor: AuthTokenPayload, schoolId: string): Promise<LowAttendanceFlagDto[]> {
  if (actor.role !== Role.GROUP_ADMIN && actor.schoolId !== schoolId) {
    throw new HttpError(403, "Not your school");
  }
  const trailingStart = new Date();
  trailingStart.setUTCDate(trailingStart.getUTCDate() - 7);
  trailingStart.setUTCHours(0, 0, 0, 0);

  const absences = await prisma.attendanceRecord.groupBy({
    by: ["studentId"],
    where: {
      type: AttendanceEntryType.DAILY_REGISTER,
      status: AttendanceStatus.ABSENT,
      date: { gte: trailingStart },
      student: { schoolId },
    },
    _count: { studentId: true },
    having: { studentId: { _count: { gte: 3 } } },
  });

  if (absences.length === 0) return [];

  const students = await prisma.student.findMany({
    where: { id: { in: absences.map((a) => a.studentId) } },
    include: { classUnit: { include: { classLevel: true } } },
  });
  const studentsById = new Map(students.map((s) => [s.id, s]));

  return absences.map((a) => {
    const student = studentsById.get(a.studentId)!;
    return {
      studentId: a.studentId,
      studentName: student.fullName,
      classUnitId: student.classUnitId,
      classUnitName: `${student.classUnit.classLevel.name}${student.classUnit.name}`,
      absenceCountTrailing7Days: a._count.studentId,
    };
  });
}

// Intended to be invoked by a scheduled job (cron) once per school's
// attendanceCutoffTime, per school day. Exposed here as a callable function
// plus an admin-triggerable endpoint for the demo, since this environment
// has no real job scheduler wired up.
export async function runNotYetArrivedCheck(schoolId: string) {
  const today = toDateOnly(new Date().toISOString());
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new HttpError(404, "School not found");

  const studentsWithoutMark = await prisma.student.findMany({
    where: {
      schoolId,
      attendanceRecords: {
        none: { date: today, type: AttendanceEntryType.DAILY_REGISTER },
      },
    },
  });

  for (const student of studentsWithoutMark) {
    await notificationsService.queueNotYetArrivedNotification({
      studentId: student.id,
      studentName: student.fullName,
      schoolName: school.name,
    });
  }

  return { flagged: studentsWithoutMark.length };
}
