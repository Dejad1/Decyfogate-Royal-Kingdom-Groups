"use client";

import { useEffect, useState } from "react";
import { formatPhoneNumber } from "@decyfogate/shared-types";
import { useAuth } from "@/lib/auth-context";
import { StaffResponse } from "./types";

export function StaffPanel({ schoolId }: { schoolId: string }) {
  const { api } = useAuth();
  const [staff, setStaff] = useState<StaffResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<StaffResponse>(`/directory/schools/${schoolId}/staff`)
      .then((data) => !cancelled && setStaff(data))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [api, schoolId]);

  if (loading || !staff) return <p className="text-sm text-slate-500">Loading staff...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Form Teachers <span className="font-normal text-slate-400">({staff.formTeachers.length})</span>
        </h3>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Class unit</th>
                <th className="px-4 py-2.5 font-medium">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.formTeachers.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{t.fullName}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {t.formTeacherOfUnits.map((u) => `${u.classLevel.name}${u.name}`).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {t.email}
                    <br />
                    {formatPhoneNumber(t.phone)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Subject Teachers <span className="font-normal text-slate-400">({staff.subjectTeachers.length})</span>
        </h3>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Subjects &amp; units</th>
                <th className="px-4 py-2.5 font-medium">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.subjectTeachers.map((t) => {
                const bySubject = new Map<string, string[]>();
                for (const a of t.subjectAssignments) {
                  const list = bySubject.get(a.subject.name) ?? [];
                  list.push(`${a.classUnit.classLevel.name}${a.classUnit.name}`);
                  bySubject.set(a.subject.name, list);
                }
                return (
                  <tr key={t.id}>
                    <td className="px-4 py-2.5 align-top font-medium text-slate-800">{t.fullName}</td>
                    <td className="px-4 py-2.5 align-top text-slate-600">
                      {Array.from(bySubject.entries()).map(([subject, units]) => (
                        <div key={subject}>
                          <span className="font-medium text-slate-700">{subject}</span>:{" "}
                          <span className="text-slate-500">{units.join(", ")}</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-2.5 align-top text-slate-500">
                      {t.email}
                      <br />
                      {formatPhoneNumber(t.phone)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
