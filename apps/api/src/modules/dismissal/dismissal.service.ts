import { DismissalType, Role, SchoolType } from "@decyfogate/shared-types";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { AuthTokenPayload } from "../../lib/jwt";
import * as notificationsService from "../notifications/notifications.service";

function toDateOnly(iso: string) {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function assertUnitAuthority(actor: AuthTokenPayload, classUnitId: string) {
  const unit = await prisma.classUnit.findUnique({
    where: { id: classUnitId },
    include: { classLevel: { include: { school: true } } },
  });
  if (!unit) throw new HttpError(404, "Class unit not found");

  const isAdminOverride =
    (actor.role === Role.SCHOOL_ADMIN && actor.schoolId === unit.classLevel.schoolId) ||
    (actor.role === Role.GROUP_ADMIN && actor.groupId === unit.classLevel.school.groupId);
  const isFormTeacher = actor.role === Role.FORM_TEACHER && unit.formTeacherId === actor.sub;

  if (!isFormTeacher && !isAdminOverride) {
    throw new HttpError(403, "Only this unit's Form Teacher (or a school admin) can manage dismissal for this class");
  }

  return unit;
}

// The known-guardian list is a convenience shortlist for the UI's
// quick-select -- never a gate. A Form Teacher can still type any name at
// the moment of dismissal.
export async function getGuardianShortlist(actor: AuthTokenPayload, studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new HttpError(404, "Student not found");
  await assertUnitAuthority(actor, student.classUnitId);

  const guardianLinks = await prisma.studentGuardian.findMany({ where: { studentId }, include: { guardian: true } });
  return guardianLinks.map((link) => ({
    guardianId: link.guardianId,
    fullName: link.guardian.fullName,
    relationship: link.relationship,
    phone: link.guardian.phone,
  }));
}

export interface LogDismissalInput {
  studentId: string;
  classUnitId: string;
  date: string;
  type: DismissalType;
  pickupPersonName?: string;
  pickupPersonRelationship?: string;
  pickupPersonPhone?: string;
  matchedGuardianId?: string;
}

export async function logDismissal(actor: AuthTokenPayload, input: LogDismissalInput) {
  const unit = await assertUnitAuthority(actor, input.classUnitId);
  const school = unit.classLevel.school;

  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student || student.classUnitId !== input.classUnitId) {
    throw new HttpError(400, "Student does not belong to this class unit");
  }

  if (input.type === "SELF_DISMISSED" && school.type !== SchoolType.SECONDARY) {
    throw new HttpError(400, "Self-dismissal is only available for Secondary students; Nursery/Primary requires naming a pickup person");
  }

  let pickupPersonName: string | null = null;
  let pickupPersonRelationship: string | null = null;
  let pickupPersonPhone: string | null = null;
  let matchedGuardianId: string | null = null;

  if (input.type === "PICKUP") {
    if (!input.pickupPersonName?.trim()) {
      throw new HttpError(400, "A pickup requires naming who collected the student");
    }
    pickupPersonName = input.pickupPersonName.trim();
    pickupPersonRelationship = input.pickupPersonRelationship?.trim() || null;
    pickupPersonPhone = input.pickupPersonPhone?.trim() || null;

    // Purely informational: only used to decide notification wording, so
    // an invalid/foreign id is silently ignored rather than rejected --
    // nothing about this field is allowed to block the entry.
    if (input.matchedGuardianId) {
      const link = await prisma.studentGuardian.findFirst({
        where: { studentId: input.studentId, guardianId: input.matchedGuardianId },
      });
      if (link) matchedGuardianId = input.matchedGuardianId;
    }
  }

  const day = toDateOnly(input.date);
  const existing = await prisma.dismissalRecord.findFirst({ where: { studentId: input.studentId, date: day } });

  const record = existing
    ? await prisma.dismissalRecord.update({
        where: { id: existing.id },
        data: {
          type: input.type,
          pickupPersonName,
          pickupPersonRelationship,
          pickupPersonPhone,
          matchedGuardianId,
          confirmedByUserId: actor.sub,
          confirmedAt: new Date(),
        },
      })
    : await prisma.dismissalRecord.create({
        data: {
          studentId: input.studentId,
          classUnitId: input.classUnitId,
          date: day,
          type: input.type,
          pickupPersonName,
          pickupPersonRelationship,
          pickupPersonPhone,
          matchedGuardianId,
          confirmedByUserId: actor.sub,
        },
      });

  await notificationsService.queueDismissalNotification({
    studentId: student.id,
    studentName: student.fullName,
    schoolName: school.name,
    type: input.type,
    pickupPersonName,
    pickupPersonRelationship,
    matched: matchedGuardianId !== null,
    dismissalRecordId: record.id,
  });

  return record;
}

export async function getTodayDismissals(actor: AuthTokenPayload, classUnitId: string) {
  await assertUnitAuthority(actor, classUnitId);
  const today = toDateOnly(new Date().toISOString());
  return prisma.dismissalRecord.findMany({ where: { classUnitId, date: today } });
}
