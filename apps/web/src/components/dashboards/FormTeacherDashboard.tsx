"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { NotificationsPanel } from "./NotificationsPanel";

interface ClassUnitMine {
  id: string;
  name: string;
  classLevel: { name: string; order: number };
}

interface GuardianLink {
  guardian: { id: string; fullName: string; phone: string };
  relationship: string;
  isPrimary: boolean;
}

interface RosterStudent {
  id: string;
  fullName: string;
  admissionNumber: string;
  guardians: GuardianLink[];
}

interface RosterResponse {
  unit: { id: string };
  students: RosterStudent[];
}

interface TodayAttendanceRecord {
  studentId: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  type: "DAILY_REGISTER" | "SUBJECT";
}

type MarkStatus = "PRESENT" | "ABSENT" | "LATE";

const STATUS_BUTTONS: { status: MarkStatus; label: string; activeClass: string }[] = [
  { status: "PRESENT", label: "Present", activeClass: "bg-emerald-600 text-white" },
  { status: "LATE", label: "Late", activeClass: "bg-amber-500 text-white" },
  { status: "ABSENT", label: "Absent", activeClass: "bg-red-600 text-white" },
];

export function FormTeacherDashboard() {
  const { api } = useAuth();
  const [unit, setUnit] = useState<ClassUnitMine | null>(null);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [marks, setMarks] = useState<Record<string, MarkStatus>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshToday = useCallback(
    async (classUnitId: string) => {
      const records = await api<TodayAttendanceRecord[]>(`/attendance/today?classUnitId=${classUnitId}`);
      const next: Record<string, MarkStatus> = {};
      for (const record of records) {
        if (record.type === "DAILY_REGISTER") next[record.studentId] = record.status;
      }
      setMarks(next);
    },
    [api]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const units = await api<ClassUnitMine[]>("/directory/class-units/mine");
        const myUnit = units[0];
        if (!myUnit) throw new Error("No class unit assigned to this account");
        if (cancelled) return;
        setUnit(myUnit);

        const roster = await api<RosterResponse>(`/directory/class-units/${myUnit.id}/roster`);
        if (cancelled) return;
        setStudents(roster.students);
        await refreshToday(myUnit.id);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load roster");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [api, refreshToday]);

  async function mark(studentId: string, status: MarkStatus) {
    if (!unit) return;
    setPending(studentId);
    setMarks((prev) => ({ ...prev, [studentId]: status }));
    try {
      await api("/attendance", {
        method: "POST",
        body: {
          studentId,
          classUnitId: unit.id,
          date: new Date().toISOString(),
          status,
          type: "DAILY_REGISTER",
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark attendance");
      await refreshToday(unit.id);
    } finally {
      setPending(null);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading your class...</p>;
  if (error && !unit) return <p className="text-sm text-red-600">{error}</p>;
  if (!unit) return null;

  const markedCount = Object.keys(marks).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Form Teacher · Daily register</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          {unit.classLevel.name}
          {unit.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {markedCount} of {students.length} pupils marked today · Today&apos;s date {new Date().toLocaleDateString("en-NG")}
        </p>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {students.map((student) => {
              const currentStatus = marks[student.id];
              const primaryGuardian = student.guardians.find((g) => g.isPrimary) ?? student.guardians[0];
              return (
                <li key={student.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{student.fullName}</p>
                    <p className="text-xs text-slate-500">
                      {student.admissionNumber}
                      {primaryGuardian && ` · ${primaryGuardian.relationship}: ${primaryGuardian.guardian.phone}`}
                    </p>
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

        <NotificationsPanel classUnitId={unit.id} />
      </div>
    </div>
  );
}
