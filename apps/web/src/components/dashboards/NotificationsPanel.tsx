"use client";

import { useEffect, useRef, useState } from "react";
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

const CHANNEL_STYLES: Record<NotificationLogRow["channel"], string> = {
  SMS: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
  WHATSAPP: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200",
};

const TRIGGER_META: Record<NotificationLogRow["trigger"], { label: string; accent: string } | null> = {
  ATTENDANCE_MARKED: null,
  NOT_YET_ARRIVED: { label: "⚠ Not yet arrived", accent: "border-l-2 border-amber-400 bg-amber-50/40" },
  BROADCAST: { label: "📢 Broadcast", accent: "border-l-2 border-sky-400 bg-sky-50/40" },
};

function timeAgo(iso: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return new Date(iso).toLocaleString();
}

function NotificationSkeleton() {
  return (
    <ul className="animate-pulse divide-y divide-slate-100" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-start justify-between gap-4 py-3">
          <div className="w-full space-y-2">
            <div className="h-3 w-2/3 rounded bg-slate-200" />
            <div className="h-2.5 w-full rounded bg-slate-100" />
            <div className="h-2 w-1/3 rounded bg-slate-100" />
          </div>
          <div className="h-5 w-16 shrink-0 rounded-full bg-slate-100" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Live "notifications sent" panel -- polls while mounted so a QUEUED row
 * visibly walks through SENT -> DELIVERED, which is the moment the brief
 * calls out as the one that has to look real, not like a toy. Rows briefly
 * highlight when their status changes between polls, and NOT_YET_ARRIVED /
 * BROADCAST rows get a distinct accent since they mean something different
 * from a routine attendance confirmation.
 */
export function NotificationsPanel({ classUnitId, schoolId }: { classUnitId?: string; schoolId?: string }) {
  const { api, user } = useAuth();
  const [logs, setLogs] = useState<NotificationLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [, forceTick] = useState(0);
  const statusByIdRef = useRef<Map<string, string>>(new Map());
  const effectiveSchoolId = schoolId ?? user?.schoolId ?? undefined;

  useEffect(() => {
    if (!effectiveSchoolId) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await api<NotificationLogRow[]>(`/notifications/logs?schoolId=${effectiveSchoolId}`);
        if (cancelled) return;

        const changedIds: string[] = [];
        for (const row of data) {
          const prevStatus = statusByIdRef.current.get(row.id);
          if (prevStatus && prevStatus !== row.status) changedIds.push(row.id);
          statusByIdRef.current.set(row.id, row.status);
        }
        if (changedIds.length > 0) {
          setHighlighted((prev) => new Set([...prev, ...changedIds]));
          setTimeout(() => {
            setHighlighted((prev) => {
              const next = new Set(prev);
              changedIds.forEach((id) => next.delete(id));
              return next;
            });
          }, 1500);
        }

        setLogs(data);
      } catch {
        // best-effort polling; ignore transient failures
      } finally {
        if (!cancelled) setLoading(false);
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
      {loading ? (
        <NotificationSkeleton />
      ) : visible.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-400">No notifications yet.</p>
          <p className="mt-1 text-xs text-slate-300">They&apos;ll appear here the moment attendance is marked.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {visible.map((log) => {
            const triggerMeta = TRIGGER_META[log.trigger];
            return (
              <li
                key={log.id}
                className={`flex items-start justify-between gap-4 rounded-lg py-3 pl-2 pr-1 text-sm transition-colors duration-700 ${
                  triggerMeta?.accent ?? ""
                } ${highlighted.has(log.id) ? "bg-amber-50" : ""}`}
              >
                <div className="min-w-0">
                  {triggerMeta && (
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                      {triggerMeta.label}
                    </p>
                  )}
                  <p className="truncate font-medium text-slate-800">
                    {log.student.fullName} <span className="font-normal text-slate-400">→</span> {log.guardian.fullName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{log.message}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${CHANNEL_STYLES[log.channel]}`}>
                      {log.channel === "SMS" ? "SMS" : "WhatsApp"}
                    </span>
                    <span className="text-[11px] text-slate-400">{timeAgo(log.createdAt)}</span>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-500 ${STATUS_STYLES[log.status]}`}
                >
                  {log.status}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
