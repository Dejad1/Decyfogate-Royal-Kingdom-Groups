import {
  AttendanceEntryType,
  ChildSummaryDto,
  DevicePlatform,
  DismissalType,
  GuardianPreferencesDto,
  NotificationChannel,
} from "@decyfogate/shared-types";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { AuthTokenPayload } from "../../lib/jwt";

function toDateOnly(iso: string) {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Read-only, purely a visibility layer for the guardian (Section 11's
// explicit non-goal: "no parent-initiated actions beyond viewing") --
// today's status per linked child.
export async function listMyChildren(actor: AuthTokenPayload): Promise<ChildSummaryDto[]> {
  const links = await prisma.studentGuardian.findMany({
    where: { guardianId: actor.sub },
    include: {
      student: {
        include: {
          classUnit: { include: { classLevel: true } },
          school: { select: { name: true } },
        },
      },
    },
  });

  const today = toDateOnly(new Date().toISOString());

  const children = await Promise.all(
    links.map(async (link) => {
      const student = link.student;
      const [attendance, dismissal] = await Promise.all([
        prisma.attendanceRecord.findFirst({
          where: { studentId: student.id, date: today, type: AttendanceEntryType.DAILY_REGISTER },
        }),
        prisma.dismissalRecord.findFirst({ where: { studentId: student.id, date: today } }),
      ]);

      const child: ChildSummaryDto = {
        studentId: student.id,
        fullName: student.fullName,
        admissionNumber: student.admissionNumber,
        classUnitName: `${student.classUnit.classLevel.name}${student.classUnit.name}`,
        schoolName: student.school.name,
        todayAttendanceStatus: attendance ? (attendance.status as ChildSummaryDto["todayAttendanceStatus"]) : null,
        todayDismissal: dismissal
          ? {
              type: dismissal.type as DismissalType,
              pickupPersonName: dismissal.pickupPersonName,
              pickupPersonRelationship: dismissal.pickupPersonRelationship,
              confirmedAt: dismissal.confirmedAt.toISOString(),
            }
          : null,
      };
      return child;
    })
  );

  return children.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function listMyNotifications(actor: AuthTokenPayload, limit = 50) {
  return prisma.notificationLog.findMany({
    where: { guardianId: actor.sub },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      student: { select: { fullName: true } },
    },
  });
}

export async function getPreferences(actor: AuthTokenPayload): Promise<GuardianPreferencesDto> {
  const guardian = await prisma.guardian.findUnique({ where: { id: actor.sub } });
  if (!guardian) throw new HttpError(404, "Guardian not found");

  const links = await prisma.studentGuardian.findMany({
    where: { guardianId: actor.sub },
    include: { student: { select: { school: { select: { whatsappEnabled: true } } } } },
  });
  const anySchoolEntitlesWhatsapp = links.some((link) => link.student.school.whatsappEnabled);

  const availableChannels: NotificationChannel[] = [
    NotificationChannel.PUSH,
    NotificationChannel.SMS,
    NotificationChannel.EMAIL,
    ...(anySchoolEntitlesWhatsapp ? [NotificationChannel.WHATSAPP] : []),
  ];

  return {
    preferredChannels: guardian.preferredChannels as NotificationChannel[],
    availableChannels,
  };
}

export async function updatePreferences(actor: AuthTokenPayload, channels: NotificationChannel[]) {
  if (channels.length === 0) {
    throw new HttpError(400, "Select at least one notification channel");
  }
  await prisma.guardian.update({ where: { id: actor.sub }, data: { preferredChannels: channels } });
  return getPreferences(actor);
}

export async function registerDeviceToken(actor: AuthTokenPayload, token: string, platform: DevicePlatform) {
  return prisma.guardianDeviceToken.upsert({
    where: { token },
    create: { guardianId: actor.sub, token, platform },
    update: { guardianId: actor.sub, platform },
  });
}
