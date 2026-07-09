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
import { buildAttendanceMessage, buildNotYetArrivedMessage } from "../../lib/messages";

// Notifications are queued, never dispatched synchronously inside the
// request that created them (per the build brief). For this demo there is
// no live Termii/Twilio/WhatsApp Business API key, so dispatch is
// simulated: a QUEUED row is created immediately, then flipped to
// SENT and DELIVERED on a short, realistic delay so the "notifications
// sent" panel shows a believable timestamped delivery lifecycle instead of
// everything appearing instantly. A production deployment would swap
// `simulateDispatch` for a real queue worker (BullMQ/Redis) calling the
// SMS/WhatsApp provider.

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

export async function queueAttendanceNotification(params: {
  studentId: string;
  studentName: string;
  schoolName: string;
  status: AttendanceStatus;
  attendanceRecordId: string;
}) {
  const guardianLinks = await prisma.studentGuardian.findMany({
    where: { studentId: params.studentId },
    include: { guardian: true },
  });

  const now = new Date();
  const message = buildAttendanceMessage(
    params.status as "PRESENT" | "LATE" | "ABSENT",
    params.studentName,
    params.schoolName,
    now
  );

  const created = await Promise.all(
    guardianLinks.flatMap((link) =>
      ([NotificationChannel.SMS, NotificationChannel.WHATSAPP] as const).map((channel) =>
        prisma.notificationLog.create({
          data: {
            studentId: params.studentId,
            guardianId: link.guardianId,
            channel,
            trigger: NotificationTrigger.ATTENDANCE_MARKED,
            message,
            attendanceRecordId: params.attendanceRecordId,
          },
        })
      )
    )
  );

  created.forEach((log) => simulateDispatch(log.id));
  return created;
}

export async function queueNotYetArrivedNotification(params: {
  studentId: string;
  studentName: string;
  schoolName: string;
}) {
  const guardianLinks = await prisma.studentGuardian.findMany({
    where: { studentId: params.studentId },
    include: { guardian: true },
  });

  const message = buildNotYetArrivedMessage(params.studentName, params.schoolName);

  const created = await Promise.all(
    guardianLinks.flatMap((link) =>
      ([NotificationChannel.SMS, NotificationChannel.WHATSAPP] as const).map((channel) =>
        prisma.notificationLog.create({
          data: {
            studentId: params.studentId,
            guardianId: link.guardianId,
            channel,
            trigger: NotificationTrigger.NOT_YET_ARRIVED,
            message,
          },
        })
      )
    )
  );

  created.forEach((log) => simulateDispatch(log.id));
  return created;
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

  const guardianLinks = await prisma.studentGuardian.findMany({
    where: { studentId: { in: studentIds } },
    select: { studentId: true, guardianId: true },
  });

  const created = await Promise.all(
    guardianLinks.flatMap((link) =>
      ([NotificationChannel.SMS, NotificationChannel.WHATSAPP] as const).map((channel) =>
        prisma.notificationLog.create({
          data: {
            studentId: link.studentId,
            guardianId: link.guardianId,
            channel,
            trigger: NotificationTrigger.BROADCAST,
            message: input.message,
          },
        })
      )
    )
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
