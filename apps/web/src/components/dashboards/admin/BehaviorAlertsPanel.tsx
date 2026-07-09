"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { BehaviorAlert } from "./types";

interface DigestRow {
  studentId: string;
  studentName: string;
  classUnitName: string;
  periodsAttended: number;
  periodsScheduled: number;
  tagCounts: Record<string, number>;
}

function timeAgo(iso: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return new Date(iso).toLocaleString();
}

export function BehaviorAlertsPanel({ schoolId, schoolType }: { schoolId: string; schoolType: "NURSERY_PRIMARY" | "SECONDARY" }) {
  const { api } = useAuth();
  const [alerts, setAlerts] = useState<BehaviorAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [acking, setAcking] = useState<string | null>(null);
  const [digestRunning, setDigestRunning] = useState(false);
  const [digestResult, setDigestResult] = useState<DigestRow[] | null>(null);
  const [digestError, setDigestError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api<BehaviorAlert[]>(`/behavior/alerts?schoolId=${schoolId}`)
      .then(setAlerts)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  async function acknowledge(id: string) {
    setAcking(id);
    try {
      await api(`/behavior/alerts/${id}/acknowledge`, { method: "POST" });
      load();
    } finally {
      setAcking(null);
    }
  }

  async function runDigest() {
    setDigestRunning(true);
    setDigestError(null);
    setDigestResult(null);
    try {
      const rows = await api<DigestRow[]>("/behavior/run-end-of-day-digest", { method: "POST", body: { schoolId } });
      setDigestResult(rows);
    } catch (err) {
      setDigestError(err instanceof Error ? err.message : "Failed to run digest");
    } finally {
      setDigestRunning(false);
    }
  }

  const open = alerts.filter((a) => a.status === "OPEN");
  const acknowledged = alerts.filter((a) => a.status === "ACKNOWLEDGED");

  return (
    <div className="space-y-6">
      {schoolType === "SECONDARY" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Secondary end-of-day digest</p>
              <p className="mt-1 max-w-xl text-xs text-slate-500">
                A second, distinct daily notification per student -- periods attended vs scheduled plus a rollup of
                any behavior notes logged that day. In production this fires once, automatically, after the school
                day ends; there is no scheduler wired up in this demo, so it&apos;s triggered here instead.
              </p>
            </div>
            <button
              onClick={runDigest}
              disabled={digestRunning}
              className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {digestRunning ? "Running..." : "Run today's digest"}
            </button>
          </div>
          {digestError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{digestError}</p>}
          {digestResult && (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                {digestResult.length} pupil{digestResult.length === 1 ? "" : "s"} notified
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Student</th>
                    <th className="px-3 py-2 font-medium">Class</th>
                    <th className="px-3 py-2 font-medium">Attended</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {digestResult.map((row) => (
                    <tr key={row.studentId}>
                      <td className="px-3 py-2 font-medium text-slate-800">{row.studentName}</td>
                      <td className="px-3 py-2 text-slate-600">{row.classUnitName}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.periodsAttended} of {row.periodsScheduled}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {Object.entries(row.tagCounts).length === 0
                          ? "--"
                          : Object.entries(row.tagCounts)
                              .map(([tag, count]) => `${tag} x${count}`)
                              .join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          The end-of-day digest is Secondary-only -- Nursery/Primary parents already get full coverage from the
          single daily register.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-sm font-semibold text-slate-900">Safeguarding alerts</p>
          <p className="mt-1 text-xs text-slate-500">
            A bullying flag from any Subject Teacher mark appears here immediately -- reviewing it is a school
            decision, not automated. The guardian only learns about it through the normal end-of-day digest.
          </p>
        </div>
        {loading ? (
          <p className="px-5 py-6 text-sm text-slate-500">Loading alerts...</p>
        ) : alerts.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-400">No safeguarding alerts.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {[...open, ...acknowledged].map((alert) => (
              <li key={alert.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        alert.status === "OPEN" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {alert.status}
                    </span>
                    <p className="truncate text-sm font-medium text-slate-900">{alert.studentName}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {alert.classUnitName} · {alert.subjectName} · flagged by {alert.raisedByName} · {timeAgo(alert.createdAt)}
                  </p>
                  {alert.comment && <p className="mt-1 text-xs text-slate-600">&ldquo;{alert.comment}&rdquo;</p>}
                </div>
                {alert.status === "OPEN" && (
                  <button
                    onClick={() => acknowledge(alert.id)}
                    disabled={acking === alert.id}
                    className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Acknowledge
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
