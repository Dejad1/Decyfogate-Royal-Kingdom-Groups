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

type BehaviorTag = "ATTENTIVE" | "DISRUPTIVE" | "SLEEPING" | "BULLYING_FLAG";

interface TodayAttendanceRecord {
  studentId: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  type: "DAILY_REGISTER" | "SUBJECT";
  subjectId: string | null;
  behaviorTag: BehaviorTag | null;
  behaviorComment?: string | null;
}

type MarkStatus = "PRESENT" | "ABSENT" | "LATE";

const STATUS_BUTTONS: { status: MarkStatus; label: string; activeClass: string }[] = [
  { status: "PRESENT", label: "Present", activeClass: "bg-emerald-600 text-white" },
  { status: "LATE", label: "Late", activeClass: "bg-amber-500 text-white" },
  { status: "ABSENT", label: "Absent", activeClass: "bg-red-600 text-white" },
];

const TAG_BUTTONS: { tag: BehaviorTag; label: string; activeClass: string }[] = [
  { tag: "ATTENTIVE", label: "Attentive", activeClass: "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-300" },
  { tag: "DISRUPTIVE", label: "Disruptive", activeClass: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300" },
  { tag: "SLEEPING", label: "Sleeping", activeClass: "bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-300" },
  { tag: "BULLYING_FLAG", label: "🚩 Bullying flag", activeClass: "bg-red-100 text-red-800 ring-1 ring-inset ring-red-300" },
];

const TAG_LABELS: Record<BehaviorTag, string> = {
  ATTENTIVE: "Attentive",
  DISRUPTIVE: "Disruptive",
  SLEEPING: "Sleeping",
  BULLYING_FLAG: "🚩 Bullying flag",
};

export function SubjectTeacherDashboard() {
  const { api } = useAuth();
  const [links, setLinks] = useState<MyLink[]>([]);
  const [selected, setSelected] = useState<MyLink | null>(null);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [records, setRecords] = useState<Record<string, TodayAttendanceRecord>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [behaviorFor, setBehaviorFor] = useState<string | null>(null);

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
      const next: Record<string, TodayAttendanceRecord> = {};
      for (const record of today) {
        if (record.type === "SUBJECT" && record.subjectId === link.subject.id) next[record.studentId] = record;
      }
      setRecords(next);
    },
    [api]
  );

  useEffect(() => {
    if (selected) loadRosterAndToday(selected).catch((err) => setError(err instanceof Error ? err.message : "Failed to load roster"));
  }, [selected, loadRosterAndToday]);

  async function mark(studentId: string, status: MarkStatus, behaviorTag?: BehaviorTag | null, behaviorComment?: string) {
    if (!selected) return;
    setPending(studentId);
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
          behaviorTag: behaviorTag ?? undefined,
          behaviorComment: behaviorComment || undefined,
        },
      });
      await loadRosterAndToday(selected);
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
          attendance reports and the low-attendance flag, but does not send guardians a duplicate notification. An
          optional behavior note feeds the secondary end-of-day digest -- a bullying flag alerts the School Admin
          immediately.
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
              const record = records[student.id];
              const currentStatus = record?.status;
              return (
                <li key={student.id} className="px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{student.fullName}</p>
                      <p className="text-xs text-slate-500">{student.admissionNumber}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {STATUS_BUTTONS.map((btn) => (
                        <button
                          key={btn.status}
                          disabled={pending === student.id}
                          onClick={() => mark(student.id, btn.status, record?.behaviorTag, record?.behaviorComment ?? undefined)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                            currentStatus === btn.status ? btn.activeClass : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                      {currentStatus && (
                        <button
                          onClick={() => setBehaviorFor(behaviorFor === student.id ? null : student.id)}
                          className="text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-800"
                        >
                          {record?.behaviorTag ? TAG_LABELS[record.behaviorTag] : "+ Behavior note"}
                        </button>
                      )}
                    </div>
                  </div>
                  {behaviorFor === student.id && currentStatus && (
                    <BehaviorNoteForm
                      submitting={pending === student.id}
                      initialTag={record?.behaviorTag ?? null}
                      initialComment={record?.behaviorComment ?? ""}
                      onSave={async (tag, comment) => {
                        await mark(student.id, currentStatus, tag ?? undefined, comment);
                        setBehaviorFor(null);
                      }}
                      onCancel={() => setBehaviorFor(null)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function BehaviorNoteForm({
  submitting,
  initialTag,
  initialComment,
  onSave,
  onCancel,
}: {
  submitting: boolean;
  initialTag: BehaviorTag | null;
  initialComment: string;
  onSave: (tag: BehaviorTag | null, comment: string) => void;
  onCancel: () => void;
}) {
  const [tag, setTag] = useState<BehaviorTag | null>(initialTag);
  const [comment, setComment] = useState(initialComment);

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        Optional behavior note -- feeds the end-of-day digest, does not notify a guardian directly.
      </p>
      <div className="flex flex-wrap gap-2">
        {TAG_BUTTONS.map((btn) => (
          <button
            key={btn.tag}
            type="button"
            onClick={() => setTag(tag === btn.tag ? null : btn.tag)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tag === btn.tag ? btn.activeClass : "bg-white text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-100"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>
      {tag === "BULLYING_FLAG" && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Saving this immediately notifies the School Admin -- the guardian only hears about it through the normal
          end-of-day digest.
        </p>
      )}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comment (optional)"
        rows={2}
        className="mt-2 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
      />
      <div className="mt-2 flex gap-3 text-xs">
        <button
          type="button"
          disabled={submitting}
          onClick={() => onSave(tag, comment)}
          className="rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white disabled:opacity-50"
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className="text-slate-500">
          Cancel
        </button>
      </div>
    </div>
  );
}
