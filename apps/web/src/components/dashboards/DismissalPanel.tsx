"use client";

import { useEffect, useState } from "react";
import { DismissalType, SchoolType } from "@decyfogate/shared-types";
import { useAuth } from "@/lib/auth-context";

interface RosterStudent {
  id: string;
  fullName: string;
  admissionNumber: string;
}

interface DismissalRecordRow {
  studentId: string;
  type: DismissalType;
  pickupPersonName: string | null;
  pickupPersonRelationship: string | null;
  matchedGuardianId: string | null;
}

interface GuardianShortlistEntry {
  guardianId: string;
  fullName: string;
  relationship: string;
  phone: string;
}

function todayIso() {
  return new Date().toISOString();
}

export function DismissalPanel({
  classUnitId,
  schoolType,
  students,
}: {
  classUnitId: string;
  schoolType: SchoolType;
  students: RosterStudent[];
}) {
  const { api } = useAuth();
  const [dismissals, setDismissals] = useState<Record<string, DismissalRecordRow>>({});
  const [expandedFor, setExpandedFor] = useState<string | null>(null);

  const loadToday = async () => {
    const data = await api<DismissalRecordRow[]>(`/dismissal/today?classUnitId=${classUnitId}`);
    const next: Record<string, DismissalRecordRow> = {};
    for (const row of data) next[row.studentId] = row;
    setDismissals(next);
  };

  useEffect(() => {
    loadToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classUnitId]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3">
        <p className="text-sm font-semibold text-slate-900">End-of-day dismissal</p>
        <p className="mt-1 text-xs text-slate-500">
          {schoolType === SchoolType.SECONDARY
            ? "Record who picked up each pupil, or mark them self-dismissed."
            : "Every pupil must be recorded with who picked them up -- self-dismissal is not available at this level."}
        </p>
      </div>
      <ul className="divide-y divide-slate-100">
        {students.map((student) => {
          const record = dismissals[student.id];
          return (
            <li key={student.id} className="px-5 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{student.fullName}</p>
                  <p className="text-xs text-slate-500">{student.admissionNumber}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {record ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                      {record.type === "SELF_DISMISSED"
                        ? "Self-dismissed"
                        : `Picked up by ${record.pickupPersonName ?? "?"}${
                            record.pickupPersonRelationship ? ` (${record.pickupPersonRelationship})` : ""
                          }`}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => setExpandedFor(expandedFor === student.id ? null : student.id)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        Log pickup
                      </button>
                      {schoolType === SchoolType.SECONDARY && (
                        <button
                          onClick={() => selfDismiss(student.id)}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          Self-dismissed
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {expandedFor === student.id && !record && (
                <PickupForm
                  studentId={student.id}
                  classUnitId={classUnitId}
                  onDone={() => {
                    setExpandedFor(null);
                    loadToday();
                  }}
                  onCancel={() => setExpandedFor(null)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );

  async function selfDismiss(studentId: string) {
    await api("/dismissal", {
      method: "POST",
      body: { studentId, classUnitId, date: todayIso(), type: "SELF_DISMISSED" },
    });
    await loadToday();
  }
}

function PickupForm({
  studentId,
  classUnitId,
  onDone,
  onCancel,
}: {
  studentId: string;
  classUnitId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { api } = useAuth();
  const [shortlist, setShortlist] = useState<GuardianShortlistEntry[] | null>(null);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [matchedGuardianId, setMatchedGuardianId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api<GuardianShortlistEntry[]>(`/dismissal/guardian-shortlist?studentId=${studentId}`).then(setShortlist);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  function pickFromShortlist(g: GuardianShortlistEntry) {
    setName(g.fullName);
    setRelationship(g.relationship);
    setPhone(g.phone);
    setMatchedGuardianId(g.guardianId);
  }

  // Free typing always overrides the shortlist match -- a name only counts
  // as "matched" when it still equals the guardian that was clicked.
  function onNameChange(value: string) {
    setName(value);
    setMatchedGuardianId((prev) => {
      if (!prev) return prev;
      const match = shortlist?.find((g) => g.guardianId === prev);
      return match && match.fullName === value ? prev : undefined;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api("/dismissal", {
        method: "POST",
        body: {
          studentId,
          classUnitId,
          date: todayIso(),
          type: "PICKUP",
          pickupPersonName: name.trim(),
          pickupPersonRelationship: relationship.trim() || undefined,
          pickupPersonPhone: phone.trim() || undefined,
          matchedGuardianId,
        },
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log pickup");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {shortlist && shortlist.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Quick fill</p>
          <div className="flex flex-wrap gap-2">
            {shortlist.map((g) => (
              <button
                key={g.guardianId}
                type="button"
                onClick={() => pickFromShortlist(g)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-900"
              >
                {g.fullName} ({g.relationship})
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Who is picking up this pupil? Any name is accepted -- no advance authorization needed.
        </p>
        <div className="grid grid-cols-3 gap-2">
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            required
            placeholder="Full name"
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
          />
          <input
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="Relationship (optional)"
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
          />
        </div>
        <div className="flex gap-3 text-xs">
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white disabled:opacity-50"
          >
            Confirm pickup
          </button>
          <button type="button" onClick={onCancel} className="text-slate-500">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
