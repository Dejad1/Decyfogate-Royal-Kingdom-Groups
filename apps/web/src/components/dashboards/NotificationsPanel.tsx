"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

interface NotificationLogRow {
  id: string;
  channel: "SMS" | "WHATSAPP";
  trigger: "ATTENDANCE_MARKED" | "NOT_YET_ARRIVED" | "BROADCAST";
  message: string;
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  student: { fullName: string; classUnitId: string };
  guardian: { fullName: string; phone: string };
}

const STATUS_STYLES: Record<NotificationLogRow["status"], string> = {
  QUEUED: "bg-slate-100 text-slate-600",
  SENT: "bg-amber-100 text-amber-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
};

function timeAgo(iso: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return new Date(iso).toLocaleString();
}

/**
 * Live "notifications sent" panel -- polls while mounted so a QUEUED row
 * visibly walks through SENT -> DELIVERED, which is the moment the brief
 * calls out as the one that has to look real, not like a toy.
 */
export function NotificationsPanel({ classUnitId, schoolId }: { classUnitId?: string; schoolId?: string }) {
  const { api, user } = useAuth();
  const [logs, setLogs] = useState<NotificationLogRow[]>([]);
  const [, forceTick] = useState(0);
  const effectiveSchoolId = schoolId ?? user?.schoolId ?? undefined;

  useEffect(() => {
    if (!effectiveSchoolId) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await api<NotificationLogRow[]>(`/notifications/logs?schoolId=${effectiveSchoolId}`);
        if (!cancelled) setLogs(data);
      } catch {
        // best-effort polling; ignore transient failures
      }
    }

    load();
    const interval = setInterval(load, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [api, effectiveSchoolId]);

  useEffect(() => {
    const tick = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  const filtered = classUnitId ? logs.filter((l) => l.student.classUnitId === classUnitId) : logs;
  const visible = filtered.slice(0, 12);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Notifications sent</h3>
        <span className="text-xs text-slate-400">Simulated SMS + WhatsApp delivery</span>
      </div>
      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No notifications yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {visible.map((log) => (
            <li key={log.id} className="flex items-start justify-between gap-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">
                  {log.student.fullName} <span className="font-normal text-slate-400">→</span> {log.guardian.fullName}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{log.message}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                  {log.channel} · {timeAgo(log.createdAt)}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[log.status]}`}>
                {log.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
