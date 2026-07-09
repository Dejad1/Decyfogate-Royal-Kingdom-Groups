"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { LowAttendanceFlag } from "./types";

export function LowAttendanceFlagsPanel({ schoolId }: { schoolId: string }) {
  const { api } = useAuth();
  const [flags, setFlags] = useState<LowAttendanceFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<LowAttendanceFlag[]>(`/attendance/low-attendance-flags?schoolId=${schoolId}`)
      .then((data) => !cancelled && setFlags(data))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [api, schoolId]);

  if (loading) return <p className="text-sm text-slate-500">Checking attendance patterns...</p>;

  if (flags.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No pupils have 3 or more absences in the trailing 7 days.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white">
      <div className="border-b border-amber-100 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
        {flags.length} pupil{flags.length === 1 ? "" : "s"} with 3+ absences in the last 7 days
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">Student</th>
            <th className="px-4 py-2.5 font-medium">Class</th>
            <th className="px-4 py-2.5 font-medium">Absences (7d)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {flags.map((flag) => (
            <tr key={flag.studentId}>
              <td className="px-4 py-2.5 font-medium text-slate-800">{flag.studentName}</td>
              <td className="px-4 py-2.5 text-slate-600">{flag.classUnitName}</td>
              <td className="px-4 py-2.5">
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  {flag.absenceCountTrailing7Days}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
