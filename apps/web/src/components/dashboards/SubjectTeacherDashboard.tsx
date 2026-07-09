"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

interface MyLink {
  id: string; // classUnitId
  name: string;
  classLevel: { name: string; order: number };
  subject: { id: string; name: string };
}

interface RosterStudent {
  id: string;
  fullName: string;
  admissionNumber: string;
}

interface RosterResponse {
  students: RosterStudent[];
}

interface TodayAttendanceRecord {
  studentId: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  type: "DAILY_REGISTER" | "SUBJECT";
  subjectId: string | null;
}

type MarkStatus = "PRESENT" | "ABSENT" | "LATE";

const STATUS_BUTTONS: { status: MarkStatus; label: string; activeClass: string }[] = [
  { status: "PRESENT", label: "Present", activeClass: "bg-emerald-600 text-white" },
  { status: "LATE", label: "Late", activeClass: "bg-amber-500 text-white" },
  { status: "ABSENT", label: "Absent", activeClass: "bg-red-600 text-white" },
];

export function SubjectTeacherDashboard() {
  const { api } = useAuth();
  const [links, setLinks] = useState<MyLink[]>([]);
  const [selected, setSelected] = useState<MyLink | null>(null);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [marks, setMarks] = useState<Record<string, MarkStatus>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<MyLink[]>("/directory/class-units/mine")
      .then((data) => {
        if (cancelled) return;
        setLinks(data);
        if (data[0]) setSelected(data[0]);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [api]);

  const loadRosterAndToday = useCallback(
    async (link: MyLink) => {
      const [roster, today] = await Promise.all([
        api<RosterResponse>(`/directory/class-units/${link.id}/roster`),
        api<TodayAttendanceRecord[]>(`/attendance/today?classUnitId=${link.id}`),
      ]);
      setStudents(roster.students);
      const next: Record<string, MarkStatus> = {};
      for (const record of today) {
        if (record.type === "SUBJECT" && record.subjectId === link.subject.id) next[record.studentId] = record.status;
      }
      setMarks(next);
    },
    [api]
  );

  useEffect(() => {
    if (selected) loadRosterAndToday(selected).catch((err) => setError(err instanceof Error ? err.message : "Failed to load roster"));
  }, [selected, loadRosterAndToday]);

  async function mark(studentId: string, status: MarkStatus) {
    if (!selected) return;
    setPending(studentId);
    setMarks((prev) => ({ ...prev, [studentId]: status }));
    try {
      await api("/attendance", {
        method: "POST",
        body: {
          studentId,
          classUnitId: selected.id,
          subjectId: selected.subject.id,
          date: new Date().toISOString(),
          status,
          type: "SUBJECT",
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark attendance");
      await loadRosterAndToday(selected);
    } finally {
      setPending(null);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading your classes...</p>;
  if (links.length === 0) return <p className="text-sm text-slate-500">You are not linked to any classes yet.</p>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Subject Teacher</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Your classes</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Subject-level attendance is recorded separately from the Form Teacher&apos;s daily register. It feeds
          attendance reports and the low-attendance flag, but does not send guardians a duplicate notification.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <button
            key={`${link.id}:${link.subject.id}`}
            onClick={() => setSelected(link)}
            className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
              selected?.id === link.id && selected.subject.id === link.subject.id
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            {link.classLevel.name}
            {link.name} · {link.subject.name}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {selected && (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-sm font-semibold text-slate-900">
              {selected.classLevel.name}
              {selected.name} · {selected.subject.name}
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {students.map((student) => {
              const currentStatus = marks[student.id];
              return (
                <li key={student.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{student.fullName}</p>
                    <p className="text-xs text-slate-500">{student.admissionNumber}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {STATUS_BUTTONS.map((btn) => (
                      <button
                        key={btn.status}
                        disabled={pending === student.id}
                        onClick={() => mark(student.id, btn.status)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                          currentStatus === btn.status ? btn.activeClass : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
