import { Role } from "@decyfogate/shared-types";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { AuthTokenPayload } from "../../lib/jwt";

export async function listSchoolsForActor(actor: AuthTokenPayload) {
  if (actor.role === Role.GROUP_ADMIN) {
    if (!actor.groupId) throw new HttpError(403, "Group admin has no group assigned");
    return prisma.school.findMany({ where: { groupId: actor.groupId }, orderBy: { name: "asc" } });
  }
  if (!actor.schoolId) throw new HttpError(403, "No school assigned to this account");
  return prisma.school.findMany({ where: { id: actor.schoolId } });
}

export async function getSchoolClassLevels(schoolId: string) {
  return prisma.classLevel.findMany({
    where: { schoolId },
    orderBy: { order: "asc" },
    include: {
      units: {
        orderBy: { name: "asc" },
        include: {
          formTeacher: { select: { id: true, fullName: true, email: true } },
          _count: { select: { students: true } },
        },
      },
    },
  });
}

export async function getSchoolSubjects(schoolId: string) {
  return prisma.subject.findMany({ where: { schoolId }, orderBy: { name: "asc" } });
}

async function assertCanAccessUnit(actor: AuthTokenPayload, classUnitId: string) {
  const unit = await prisma.classUnit.findUnique({
    where: { id: classUnitId },
    include: { classLevel: true },
  });
  if (!unit) throw new HttpError(404, "Class unit not found");

  if (actor.role === Role.GROUP_ADMIN) return unit;
  if (actor.role === Role.SCHOOL_ADMIN || actor.role === Role.COMPLIANCE_OFFICER) {
    if (unit.classLevel.schoolId !== actor.schoolId) throw new HttpError(403, "Not your school");
    return unit;
  }
  if (actor.role === Role.FORM_TEACHER) {
    if (unit.formTeacherId !== actor.sub) throw new HttpError(403, "Not your class unit");
    return unit;
  }
  if (actor.role === Role.SUBJECT_TEACHER) {
    const link = await prisma.classSubjectTeacher.findFirst({
      where: { classUnitId, teacherId: actor.sub },
    });
    if (!link) throw new HttpError(403, "You are not linked to teach this class unit");
    return unit;
  }
  throw new HttpError(403, "Forbidden");
}

export async function getRoster(actor: AuthTokenPayload, classUnitId: string) {
  const unit = await assertCanAccessUnit(actor, classUnitId);
  const students = await prisma.student.findMany({
    where: { classUnitId },
    orderBy: { fullName: "asc" },
    include: {
      guardians: { include: { guardian: true } },
    },
  });
  return { unit, students };
}

export async function listMyClassUnits(actor: AuthTokenPayload) {
  if (actor.role === Role.FORM_TEACHER) {
    return prisma.classUnit.findMany({
      where: { formTeacherId: actor.sub },
      include: { classLevel: true },
    });
  }
  if (actor.role === Role.SUBJECT_TEACHER) {
    const links = await prisma.classSubjectTeacher.findMany({
      where: { teacherId: actor.sub },
      include: { classUnit: { include: { classLevel: true } }, subject: true },
    });
    return links.map((l) => ({ ...l.classUnit, subject: l.subject }));
  }
  throw new HttpError(400, "Only teachers have a personal class unit list");
}
