import { AttendanceEntryType, AttendanceStatus, BehaviorAlertStatus, EndOfDayDigestRow, Role, SchoolType } from "@decyfogate/shared-types";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { AuthTokenPayload } from "../../lib/jwt";
import * as notificationsService from "../notifications/notifications.service";

function toDateOnly(iso: string) {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function assertSchoolAdminAccess(actor: AuthTokenPayload, schoolId: string) {
  const isGroupAdmin = actor.role === Role.GROUP_ADMIN;
  const isSchoolAdmin = actor.role === Role.SCHOOL_ADMIN && actor.schoolId === schoolId;
  if (!isGroupAdmin && !isSchoolAdmin) {
    throw new HttpError(403, "Not your school");
  }
}

// Called from attendance.service the moment a BULLYING_FLAG tag is
// logged -- this is a safeguarding concern, not a performance one, so it
// must not wait for the end-of-day digest (build brief section 8, point
// 4). One alert per underlying attendance mark: re-submitting the same
// mark with the tag still set does not spam a second alert.
export async function raiseBullyingAlertIfNeeded(params: {
  attendanceRecordId: string;
  studentId: string;
  classUnitId: string;
  subjectId: string;
  comment: string | null;
  raisedByUserId: string;
}) {
  const existing = await prisma.behaviorAlert.findFirst({ where: { attendanceRecordId: params.attendanceRecordId } });
  if (existing) return existing;

  return prisma.behaviorAlert.create({
    data: {
      attendanceRecordId: params.attendanceRecordId,
      studentId: params.studentId,
      classUnitId: params.classUnitId,
      subjectId: params.subjectId,
      comment: params.comment,
      raisedByUserId: params.raisedByUserId,
    },
  });
}

export async function listBehaviorAlerts(actor: AuthTokenPayload, schoolId: string) {
  await assertSchoolAdminAccess(actor, schoolId);

  const alerts = await prisma.behaviorAlert.findMany({
    where: { student: { schoolId } },
    orderBy: { createdAt: "desc" },
    include: {
      student: true,
      classUnit: { include: { classLevel: true } },
      subject: true,
      raisedByUser: true,
    },
  });

  return alerts.map((alert) => ({
    id: alert.id,
    studentId: alert.studentId,
    studentName: alert.student.fullName,
    classUnitId: alert.classUnitId,
    classUnitName: `${alert.classUnit.classLevel.name}${alert.classUnit.name}`,
    subjectName: alert.subject.name,
    comment: alert.comment,
    status: alert.status,
    raisedByName: alert.raisedByUser.fullName,
    createdAt: alert.createdAt.toISOString(),
    acknowledgedAt: alert.acknowledgedAt?.toISOString() ?? null,
  }));
}

// Acknowledging never notifies the guardian directly -- that still only
// happens through the normal end-of-day digest, or sooner at the
// school's discretion outside this system, per the brief's sequencing.
export async function acknowledgeBehaviorAlert(actor: AuthTokenPayload, alertId: string) {
  const alert = await prisma.behaviorAlert.findUnique({ where: { id: alertId }, include: { student: true } });
  if (!alert) throw new HttpError(404, "Alert not found");
  await assertSchoolAdminAccess(actor, alert.student.schoolId);

  if (alert.status === BehaviorAlertStatus.ACKNOWLEDGED) return alert;

  return prisma.behaviorAlert.update({
    where: { id: alertId },
    data: { status: BehaviorAlertStatus.ACKNOWLEDGED, acknowledgedByUserId: actor.sub, acknowledgedAt: new Date() },
  });
}

// Intended to be invoked by a scheduled job (cron) once per secondary
// school, at a fixed time after the school day ends -- exposed here as a
// callable function plus an admin-triggerable endpoint for the demo,
// mirroring attendance.service's runNotYetArrivedCheck, since this
// environment has no real job scheduler wired up.
//
// "Periods scheduled" has no dedicated timetable model to draw on (out of
// scope per the brief's own non-goals), so it is derived from the number
// of distinct subjects a class unit has a linked Subject Teacher for
// (ClassSubjectTeacher) -- a stable proxy for "how many classes should
// happen today" that needs no new schema. "Periods attended" is the
// count of those subjects where the student has a SUBJECT-type mark for
// today with status PRESENT or LATE.
export async function runEndOfDayDigest(actor: AuthTokenPayload, schoolId: string): Promise<EndOfDayDigestRow[]> {
  await assertSchoolAdminAccess(actor, schoolId);

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new HttpError(404, "School not found");
  if (school.type !== SchoolType.SECONDARY) {
    throw new HttpError(400, "The end-of-day digest only applies to Secondary schools");
  }

  const today = toDateOnly(new Date().toISOString());

  const units = await prisma.classUnit.findMany({
    where: { classLevel: { schoolId } },
    include: {
      classLevel: true,
      students: true,
      subjectTeachers: { select: { subjectId: true }, distinct: ["subjectId"] },
    },
  });

  const rows: EndOfDayDigestRow[] = [];

  for (const unit of units) {
    const periodsScheduled = unit.subjectTeachers.length;
    if (unit.students.length === 0 || periodsScheduled === 0) continue;

    const studentIds = unit.students.map((s) => s.id);
    const todayRecords = await prisma.attendanceRecord.findMany({
      where: { studentId: { in: studentIds }, date: today, type: AttendanceEntryType.SUBJECT },
    });

    const recordsByStudent = new Map<string, typeof todayRecords>();
    for (const record of todayRecords) {
      const list = recordsByStudent.get(record.studentId) ?? [];
      list.push(record);
      recordsByStudent.set(record.studentId, list);
    }

    for (const student of unit.students) {
      const records = recordsByStudent.get(student.id) ?? [];
      const attendedSubjectIds = new Set(
        records
          .filter((r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE)
          .map((r) => r.subjectId!)
      );
      const tagCounts: Partial<Record<string, number>> = {};
      for (const record of records) {
        if (record.behaviorTag) tagCounts[record.behaviorTag] = (tagCounts[record.behaviorTag] ?? 0) + 1;
      }

      const row: EndOfDayDigestRow = {
        studentId: student.id,
        studentName: student.fullName,
        classUnitName: `${unit.classLevel.name}${unit.name}`,
        periodsAttended: attendedSubjectIds.size,
        periodsScheduled,
        tagCounts,
      };
      rows.push(row);

      await notificationsService.queueEndOfDayDigestNotification({
        studentId: student.id,
        studentName: student.fullName,
        schoolName: school.name,
        periodsAttended: row.periodsAttended,
        periodsScheduled: row.periodsScheduled,
        tagCounts,
      });
    }
  }

  return rows;
}
