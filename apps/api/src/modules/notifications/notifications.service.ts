import {
  AttendanceStatus,
  NotificationChannel,
  NotificationTrigger,
} from "@decyfogate/shared-types";
import { prisma } from "../../lib/prisma";

// Notifications are queued, never dispatched synchronously inside the
// request that created them (per the build brief). For this demo there is
// no live Termii/Twilio/WhatsApp Business API key, so dispatch is
// simulated: a QUEUED row is created immediately, then flipped to
// SENT and DELIVERED on a short, realistic delay so the "notifications
// sent" panel shows a believable timestamped delivery lifecycle instead of
// everything appearing instantly. A production deployment would swap
// `simulateDispatch` for a real queue worker (BullMQ/Redis) calling the
// SMS/WhatsApp provider.

function attendanceMessage(studentName: string, schoolName: string, status: AttendanceStatus, time: Date) {
  const stamp = time.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
  switch (status) {
    case AttendanceStatus.PRESENT:
      return `${schoolName}: ${studentName} was marked PRESENT at ${stamp} today.`;
    case AttendanceStatus.LATE:
      return `${schoolName}: ${studentName} arrived LATE at ${stamp} today.`;
    case AttendanceStatus.ABSENT:
      return `${schoolName}: ${studentName} was marked ABSENT today. Please contact the school office if this is unexpected.`;
  }
}

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
  const message = attendanceMessage(params.studentName, params.schoolName, params.status, now);

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

  const message = `${params.schoolName}: ${params.studentName} has not yet been marked present today. If this is unexpected, please contact the school office.`;

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
