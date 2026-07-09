import {
  AttendanceStatus,
  BroadcastScope,
  NotificationChannel,
  NotificationTrigger,
  Role,
} from "@decyfogate/shared-types";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { AuthTokenPayload } from "../../lib/jwt";
import {
  buildAttendanceMessage,
  buildDismissalMessage,
  buildEndOfDayDigestMessage,
  buildNotYetArrivedMessage,
} from "../../lib/messages";

// Notifications are queued, never dispatched synchronously inside the
// request that created them (per the build brief). For this demo there is
// no live Termii/Twilio/WhatsApp Business API key -- and, per Section 11,
// no real Firebase/SendGrid-class provider either -- so dispatch is
// simulated across all four channels identically: a QUEUED row is created
// immediately, then flipped to SENT and DELIVERED on a short, realistic
// delay so the "notifications sent" panel shows a believable timestamped
// delivery lifecycle instead of everything appearing instantly. A
// production deployment would swap `simulateDispatch` for a real queue
// worker calling the relevant provider per channel.

function simulateDispatch(notificationLogId: string) {
  const sentDelayMs = 400 + Math.random() * 800;
  const deliveredDelayMs = sentDelayMs + 800 + Math.random() * 1500;

  setTimeout(() => {
    prisma.notificationLog
      .update({ where: { id: notificationLogId }, data: { status: "SENT", sentAt: new Date() } })
      .catch(() => undefined);
  }, sentDelayMs);

  setTimeout(() => {
    // ~4% simulated failure rate so the delivery log looks like a real carrier, not a toy
    const failed = Math.random() < 0.04;
    prisma.notificationLog
      .update({
        where: { id: notificationLogId },
        data: failed
          ? { status: "FAILED" }
          : { status: "DELIVERED", deliveredAt: new Date() },
      })
      .catch(() => undefined);
  }, deliveredDelayMs);
}

// Section 11's core routing rule: a guardian's preferredChannels is what
// they *want* (defaults to [SMS, WHATSAPP], the exact pre-Section-11
// behavior, for anyone who's never touched the Companion App), filtered
// down to what's actually deliverable for *this* message --
// WHATSAPP only survives if the school this notification is about has it
// enabled, and PUSH only survives if the guardian has a registered
// device. If that filtering empties the list (e.g. a guardian who only
// wants WhatsApp, at a school that doesn't have it), fall back to SMS so
// nobody silently gets nothing.
function resolveChannels(
  preferredChannels: NotificationChannel[],
  whatsappEnabled: boolean,
  hasDeviceToken: boolean
): NotificationChannel[] {
  const resolved = preferredChannels.filter((channel) => {
    if (channel === NotificationChannel.WHATSAPP) return whatsappEnabled;
    if (channel === NotificationChannel.PUSH) return hasDeviceToken;
    return true;
  });
  return resolved.length > 0 ? resolved : [NotificationChannel.SMS];
}

interface GuardianForRouting {
  guardianId: string;
  preferredChannels: NotificationChannel[];
  hasDeviceToken: boolean;
}

async function guardianLinksWithRouting(studentId: string): Promise<GuardianForRouting[]> {
  const links = await prisma.studentGuardian.findMany({
    where: { studentId },
    include: { guardian: { include: { deviceTokens: { select: { id: true }, take: 1 } } } },
  });
  return links.map((link) => ({
    guardianId: link.guardianId,
    preferredChannels: link.guardian.preferredChannels as NotificationChannel[],
    hasDeviceToken: link.guardian.deviceTokens.length > 0,
  }));
}

async function dispatchToGuardians(
  guardians: GuardianForRouting[],
  studentId: string,
  whatsappEnabled: boolean,
  build: (guardianId: string) => { trigger: NotificationTrigger; message: string; attendanceRecordId?: string; dismissalRecordId?: string }
) {
  const created = await Promise.all(
    guardians.flatMap((g) => {
      const channels = resolveChannels(g.preferredChannels, whatsappEnabled, g.hasDeviceToken);
      const { trigger, message, attendanceRecordId, dismissalRecordId } = build(g.guardianId);
      return channels.map((channel) =>
        prisma.notificationLog.create({
          data: {
            studentId,
            guardianId: g.guardianId,
            channel,
            trigger,
            message,
            attendanceRecordId,
            dismissalRecordId,
          },
        })
      );
    })
  );
  created.forEach((log) => simulateDispatch(log.id));
  return created;
}

export async function queueAttendanceNotification(params: {
  studentId: string;
  studentName: string;
  schoolName: string;
  whatsappEnabled: boolean;
  status: AttendanceStatus;
  attendanceRecordId: string;
}) {
  const guardians = await guardianLinksWithRouting(params.studentId);
  const now = new Date();
  const message = buildAttendanceMessage(
    params.status as "PRESENT" | "LATE" | "ABSENT",
    params.studentName,
    params.schoolName,
    now
  );

  return dispatchToGuardians(guardians, params.studentId, params.whatsappEnabled, () => ({
    trigger: NotificationTrigger.ATTENDANCE_MARKED,
    message,
    attendanceRecordId: params.attendanceRecordId,
  }));
}

export async function queueDismissalNotification(params: {
  studentId: string;
  studentName: string;
  schoolName: string;
  whatsappEnabled: boolean;
  type: "PICKUP" | "SELF_DISMISSED";
  pickupPersonName: string | null;
  pickupPersonRelationship: string | null;
  matched: boolean;
  dismissalRecordId: string;
}) {
  const guardians = await guardianLinksWithRouting(params.studentId);
  const now = new Date();
  const message = buildDismissalMessage(
    params.type,
    params.studentName,
    params.schoolName,
    now,
    params.pickupPersonName,
    params.pickupPersonRelationship,
    params.matched
  );

  return dispatchToGuardians(guardians, params.studentId, params.whatsappEnabled, () => ({
    trigger: NotificationTrigger.DISMISSAL_CONFIRMED,
    message,
    dismissalRecordId: params.dismissalRecordId,
  }));
}

export async function queueNotYetArrivedNotification(params: {
  studentId: string;
  studentName: string;
  schoolName: string;
  whatsappEnabled: boolean;
}) {
  const guardians = await guardianLinksWithRouting(params.studentId);
  const message = buildNotYetArrivedMessage(params.studentName, params.schoolName);

  return dispatchToGuardians(guardians, params.studentId, params.whatsappEnabled, () => ({
    trigger: NotificationTrigger.NOT_YET_ARRIVED,
    message,
  }));
}

export async function queueEndOfDayDigestNotification(params: {
  studentId: string;
  studentName: string;
  schoolName: string;
  whatsappEnabled: boolean;
  periodsAttended: number;
  periodsScheduled: number;
  tagCounts: Partial<Record<string, number>>;
}) {
  const guardians = await guardianLinksWithRouting(params.studentId);
  const message = buildEndOfDayDigestMessage(
    params.studentName,
    params.schoolName,
    params.periodsAttended,
    params.periodsScheduled,
    params.tagCounts
  );

  return dispatchToGuardians(guardians, params.studentId, params.whatsappEnabled, () => ({
    trigger: NotificationTrigger.END_OF_DAY_DIGEST,
    message,
  }));
}

export interface BroadcastInput {
  scope: BroadcastScope;
  groupId?: string;
  schoolId?: string;
  classLevelId?: string;
  classUnitId?: string;
  message: string;
}

async function resolveBroadcastStudentIds(actor: AuthTokenPayload, input: BroadcastInput): Promise<string[]> {
  switch (input.scope) {
    case BroadcastScope.GROUP: {
      const groupId = input.groupId ?? actor.groupId ?? undefined;
      if (!groupId) throw new HttpError(400, "groupId is required for a group-wide broadcast");
      if (actor.role !== Role.GROUP_ADMIN) throw new HttpError(403, "Only a Group Admin can broadcast group-wide");
      const students = await prisma.student.findMany({ where: { school: { groupId } }, select: { id: true } });
      return students.map((s) => s.id);
    }
    case BroadcastScope.SCHOOL: {
      const schoolId = input.schoolId ?? actor.schoolId ?? undefined;
      if (!schoolId) throw new HttpError(400, "schoolId is required");
      if (actor.role === Role.SCHOOL_ADMIN && actor.schoolId !== schoolId) throw new HttpError(403, "Not your school");
      const students = await prisma.student.findMany({ where: { schoolId }, select: { id: true } });
      return students.map((s) => s.id);
    }
    case BroadcastScope.LEVEL: {
      if (!input.classLevelId) throw new HttpError(400, "classLevelId is required");
      const students = await prisma.student.findMany({
        where: { classUnit: { classLevelId: input.classLevelId } },
        select: { id: true },
      });
      return students.map((s) => s.id);
    }
    case BroadcastScope.UNIT: {
      if (!input.classUnitId) throw new HttpError(400, "classUnitId is required");
      const students = await prisma.student.findMany({ where: { classUnitId: input.classUnitId }, select: { id: true } });
      return students.map((s) => s.id);
    }
    default:
      throw new HttpError(400, "Unknown broadcast scope");
  }
}

export async function sendBroadcast(actor: AuthTokenPayload, input: BroadcastInput) {
  const studentIds = await resolveBroadcastStudentIds(actor, input);
  if (studentIds.length === 0) return { recipients: 0 };

  // A broadcast can span many schools (group-wide scope), so entitlement
  // is resolved per guardian-student pair against that student's own
  // school, same as every other notification type.
  const guardianLinks = await prisma.studentGuardian.findMany({
    where: { studentId: { in: studentIds } },
    select: {
      studentId: true,
      guardianId: true,
      guardian: { include: { deviceTokens: { select: { id: true }, take: 1 } } },
      student: { select: { school: { select: { whatsappEnabled: true } } } },
    },
  });

  const created = await Promise.all(
    guardianLinks.flatMap((link) => {
      const channels = resolveChannels(
        link.guardian.preferredChannels as NotificationChannel[],
        link.student.school.whatsappEnabled,
        link.guardian.deviceTokens.length > 0
      );
      return channels.map((channel) =>
        prisma.notificationLog.create({
          data: {
            studentId: link.studentId,
            guardianId: link.guardianId,
            channel,
            trigger: NotificationTrigger.BROADCAST,
            message: input.message,
          },
        })
      );
    })
  );

  created.forEach((log) => simulateDispatch(log.id));
  return { recipients: guardianLinks.length, notificationsQueued: created.length };
}

export async function listNotificationLogs(schoolId: string, limit = 100) {
  return prisma.notificationLog.findMany({
    where: { student: { schoolId } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      student: { select: { fullName: true, classUnitId: true } },
      guardian: { select: { fullName: true, phone: true } },
    },
  });
}
