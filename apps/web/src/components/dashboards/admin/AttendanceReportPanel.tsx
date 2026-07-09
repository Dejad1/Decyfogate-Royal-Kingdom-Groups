"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AttendanceReportRow } from "./types";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function AttendanceReportPanel({ schoolId }: { schoolId: string }) {
  const { api } = useAuth();
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 27);
    return isoDate(d);
  });
  const [to, setTo] = useState(() => isoDate(new Date()));
  const [rows, setRows] = useState<AttendanceReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runReport() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<AttendanceReportRow[]>(
        `/attendance/report?schoolId=${schoolId}&from=${from}&to=${to}`
      );
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-600">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm text-slate-600">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </label>
        <button
          onClick={runReport}
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Running..." : "Run report"}
        </button>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Student</th>
              <th className="px-4 py-2.5 font-medium">Class</th>
              <th className="px-4 py-2.5 font-medium">Present</th>
              <th className="px-4 py-2.5 font-medium">Late</th>
              <th className="px-4 py-2.5 font-medium">Absent</th>
              <th className="px-4 py-2.5 font-medium">Attendance %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.studentId}>
                <td className="px-4 py-2.5 font-medium text-slate-800">{row.studentName}</td>
                <td className="px-4 py-2.5 text-slate-600">{row.classUnitName}</td>
                <td className="px-4 py-2.5 text-slate-600">{row.daysPresent}</td>
                <td className="px-4 py-2.5 text-slate-600">{row.daysLate}</td>
                <td className="px-4 py-2.5 text-slate-600">{row.daysAbsent}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.attendancePercentage >= 90
                        ? "bg-emerald-100 text-emerald-700"
                        : row.attendancePercentage >= 75
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {row.attendancePercentage}%
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No attendance records for this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
