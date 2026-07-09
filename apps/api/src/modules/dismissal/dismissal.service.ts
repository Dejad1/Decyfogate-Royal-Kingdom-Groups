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

export async function getAuthorizedPickupList(actor: AuthTokenPayload, studentId: string, date: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new HttpError(404, "Student not found");
  await assertUnitAuthority(actor, student.classUnitId);

  const day = toDateOnly(date);

  const [guardianLinks, oneOffPeople] = await Promise.all([
    prisma.studentGuardian.findMany({ where: { studentId }, include: { guardian: true } }),
    prisma.authorizedPickupPerson.findMany({ where: { studentId, date: day } }),
  ]);

  return {
    guardians: guardianLinks.map((link) => ({
      guardianId: link.guardianId,
      fullName: link.guardian.fullName,
      relationship: link.relationship,
      phone: link.guardian.phone,
    })),
    oneOffPeopleToday: oneOffPeople.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      relationship: p.relationship,
      phone: p.phone,
    })),
  };
}

export interface AddOneOffPickupPersonInput {
  studentId: string;
  fullName: string;
  relationship: string;
  phone?: string;
  date: string;
}

export async function addOneOffPickupPerson(actor: AuthTokenPayload, input: AddOneOffPickupPersonInput) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new HttpError(404, "Student not found");
  await assertUnitAuthority(actor, student.classUnitId);

  return prisma.authorizedPickupPerson.create({
    data: {
      studentId: input.studentId,
      fullName: input.fullName,
      relationship: input.relationship,
      phone: input.phone,
      date: toDateOnly(input.date),
      addedByUserId: actor.sub,
    },
  });
}

export interface LogDismissalInput {
  studentId: string;
  classUnitId: string;
  date: string;
  type: DismissalType;
  guardianId?: string;
  oneOffPickupPersonId?: string;
}

export async function logDismissal(actor: AuthTokenPayload, input: LogDismissalInput) {
  const unit = await assertUnitAuthority(actor, input.classUnitId);
  const school = unit.classLevel.school;

  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student || student.classUnitId !== input.classUnitId) {
    throw new HttpError(400, "Student does not belong to this class unit");
  }

  if (input.type === "SELF_DISMISSED" && school.type !== SchoolType.SECONDARY) {
    throw new HttpError(400, "Self-dismissal is only available for Secondary students; Nursery/Primary requires pickup selection");
  }

  const day = toDateOnly(input.date);
  let pickedUpByName: string | null = null;
  let pickedUpByRelationship: string | null = null;
  let guardianId: string | null = null;
  let oneOffPickupPersonId: string | null = null;

  if (input.type === "PICKUP") {
    if (!input.guardianId && !input.oneOffPickupPersonId) {
      throw new HttpError(400, "A pickup requires selecting an authorized guardian or same-day authorized person");
    }
    if (input.guardianId) {
      const link = await prisma.studentGuardian.findFirst({
        where: { studentId: input.studentId, guardianId: input.guardianId },
        include: { guardian: true },
      });
      if (!link) {
        throw new HttpError(403, "That guardian is not on this student's authorized list");
      }
      guardianId = link.guardianId;
      pickedUpByName = link.guardian.fullName;
      pickedUpByRelationship = link.relationship;
    } else if (input.oneOffPickupPersonId) {
      const person = await prisma.authorizedPickupPerson.findFirst({
        where: { id: input.oneOffPickupPersonId, studentId: input.studentId, date: day },
      });
      if (!person) {
        throw new HttpError(403, "That person is not authorized to collect this student today");
      }
      oneOffPickupPersonId = person.id;
      pickedUpByName = person.fullName;
      pickedUpByRelationship = person.relationship;
    }
  }

  const existing = await prisma.dismissalRecord.findFirst({ where: { studentId: input.studentId, date: day } });

  const record = existing
    ? await prisma.dismissalRecord.update({
        where: { id: existing.id },
        data: {
          type: input.type,
          guardianId,
          oneOffPickupPersonId,
          pickedUpByName,
          pickedUpByRelationship,
          loggedByUserId: actor.sub,
          loggedAt: new Date(),
        },
      })
    : await prisma.dismissalRecord.create({
        data: {
          studentId: input.studentId,
          classUnitId: input.classUnitId,
          date: day,
          type: input.type,
          guardianId,
          oneOffPickupPersonId,
          pickedUpByName,
          pickedUpByRelationship,
          loggedByUserId: actor.sub,
        },
      });

  await notificationsService.queueDismissalNotification({
    studentId: student.id,
    studentName: student.fullName,
    schoolName: school.name,
    type: input.type,
    pickedUpByName,
    pickedUpByRelationship,
    dismissalRecordId: record.id,
  });

  return record;
}

export async function getTodayDismissals(actor: AuthTokenPayload, classUnitId: string) {
  await assertUnitAuthority(actor, classUnitId);
  const today = toDateOnly(new Date().toISOString());
  return prisma.dismissalRecord.findMany({ where: { classUnitId, date: today } });
}

export interface EscalateInput {
  studentId: string;
  classUnitId: string;
  attemptedPickupPersonName: string;
  attemptedPickupPersonPhone?: string;
  note?: string;
}

export async function escalateUnauthorizedPickup(actor: AuthTokenPayload, input: EscalateInput) {
  await assertUnitAuthority(actor, input.classUnitId);

  return prisma.dismissalEscalation.create({
    data: {
      studentId: input.studentId,
      classUnitId: input.classUnitId,
      attemptedPickupPersonName: input.attemptedPickupPersonName,
      attemptedPickupPersonPhone: input.attemptedPickupPersonPhone,
      note: input.note,
      reportedByUserId: actor.sub,
    },
  });
}

export async function listEscalations(actor: AuthTokenPayload, schoolId: string, status?: "OPEN" | "RESOLVED") {
  if (actor.role !== Role.GROUP_ADMIN && actor.schoolId !== schoolId) {
    throw new HttpError(403, "Not your school");
  }
  return prisma.dismissalEscalation.findMany({
    where: { classUnit: { classLevel: { schoolId } }, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { fullName: true } },
      classUnit: { select: { name: true, classLevel: { select: { name: true } } } },
      reportedByUser: { select: { fullName: true } },
    },
  });
}

export async function resolveEscalation(actor: AuthTokenPayload, escalationId: string) {
  const escalation = await prisma.dismissalEscalation.findUnique({
    where: { id: escalationId },
    include: { classUnit: { include: { classLevel: { include: { school: true } } } } },
  });
  if (!escalation) throw new HttpError(404, "Escalation not found");

  const isAdmin =
    (actor.role === Role.SCHOOL_ADMIN && actor.schoolId === escalation.classUnit.classLevel.schoolId) ||
    (actor.role === Role.GROUP_ADMIN && actor.groupId === escalation.classUnit.classLevel.school.groupId);
  if (!isAdmin) throw new HttpError(403, "Only a School Admin can resolve an escalation");

  return prisma.dismissalEscalation.update({
    where: { id: escalationId },
    data: { status: "RESOLVED", resolvedByUserId: actor.sub, resolvedAt: new Date() },
  });
}
