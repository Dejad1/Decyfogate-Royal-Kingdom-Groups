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
  pickedUpByName: string | null;
  pickedUpByRelationship: string | null;
}

interface AuthorizedListResponse {
  guardians: { guardianId: string; fullName: string; relationship: string; phone: string }[];
  oneOffPeopleToday: { id: string; fullName: string; relationship: string; phone: string | null }[];
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
            ? "Select who picked up each pupil, or mark them self-dismissed."
            : "Every pupil must be marked with who picked them up -- self-dismissal is not available at this level."}
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
                        : `Picked up by ${record.pickedUpByName ?? "?"}${
                            record.pickedUpByRelationship ? ` (${record.pickedUpByRelationship})` : ""
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
                <PickupPicker
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

function PickupPicker({
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
  const [list, setList] = useState<AuthorizedListResponse | null>(null);
  const [mode, setMode] = useState<"pick" | "add-visitor" | "escalate">("pick");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [visitorName, setVisitorName] = useState("");
  const [visitorRelationship, setVisitorRelationship] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");

  const [escalateName, setEscalateName] = useState("");
  const [escalatePhone, setEscalatePhone] = useState("");
  const [escalateNote, setEscalateNote] = useState("");
  const [escalated, setEscalated] = useState(false);

  const loadList = async () => {
    const data = await api<AuthorizedListResponse>(`/dismissal/authorized-list?studentId=${studentId}&date=${todayIso()}`);
    setList(data);
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function confirmPickup(guardianId?: string, oneOffPickupPersonId?: string) {
    setSubmitting(true);
    setError(null);
    try {
      await api("/dismissal", {
        method: "POST",
        body: { studentId, classUnitId, date: todayIso(), type: "PICKUP", guardianId, oneOffPickupPersonId },
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log pickup");
    } finally {
      setSubmitting(false);
    }
  }

  async function addVisitor(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api("/dismissal/one-off-pickup-person", {
        method: "POST",
        body: { studentId, fullName: visitorName, relationship: visitorRelationship, phone: visitorPhone || undefined, date: todayIso() },
      });
      setMode("pick");
      setVisitorName("");
      setVisitorRelationship("");
      setVisitorPhone("");
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add visitor");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitEscalation(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api("/dismissal/escalate", {
        method: "POST",
        body: {
          studentId,
          classUnitId,
          attemptedPickupPersonName: escalateName,
          attemptedPickupPersonPhone: escalatePhone || undefined,
          note: escalateNote || undefined,
        },
      });
      setEscalated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to escalate");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {mode === "pick" && (
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Authorized guardians</p>
            <div className="flex flex-wrap gap-2">
              {list?.guardians.map((g) => (
                <button
                  key={g.guardianId}
                  disabled={submitting}
                  onClick={() => confirmPickup(g.guardianId, undefined)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-900 disabled:opacity-50"
                >
                  {g.fullName} ({g.relationship})
                </button>
              ))}
              {list && list.guardians.length === 0 && <p className="text-xs text-slate-400">No guardians on file.</p>}
            </div>
          </div>

          {list && list.oneOffPeopleToday.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Authorized today only</p>
              <div className="flex flex-wrap gap-2">
                {list.oneOffPeopleToday.map((p) => (
                  <button
                    key={p.id}
                    disabled={submitting}
                    onClick={() => confirmPickup(undefined, p.id)}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:border-amber-500 disabled:opacity-50"
                  >
                    {p.fullName} ({p.relationship})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 border-t border-slate-200 pt-3 text-xs">
            <button onClick={() => setMode("add-visitor")} className="font-medium text-slate-700 underline underline-offset-2">
              + Add a visitor pickup for today
            </button>
            <button onClick={() => setMode("escalate")} className="font-medium text-red-700 underline underline-offset-2">
              Person not on this list
            </button>
            <button onClick={onCancel} className="ml-auto text-slate-400">
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "add-visitor" && (
        <form onSubmit={addVisitor} className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Authorize a visitor for today only (not added as a permanent guardian)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <input
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              required
              placeholder="Full name"
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />
            <input
              value={visitorRelationship}
              onChange={(e) => setVisitorRelationship(e.target.value)}
              required
              placeholder="Relationship"
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />
            <input
              value={visitorPhone}
              onChange={(e) => setVisitorPhone(e.target.value)}
              placeholder="Phone (optional)"
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />
          </div>
          <div className="flex gap-3 text-xs">
            <button type="submit" disabled={submitting} className="rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white disabled:opacity-50">
              Authorize for today
            </button>
            <button type="button" onClick={() => setMode("pick")} className="text-slate-500">
              Back
            </button>
          </div>
        </form>
      )}

      {mode === "escalate" && !escalated && (
        <form onSubmit={submitEscalation} className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-red-700">
            This person is not on the authorized list. This will not dismiss the pupil -- it flags the School Admin
            to review before anyone is released to them.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={escalateName}
              onChange={(e) => setEscalateName(e.target.value)}
              required
              placeholder="Their name"
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />
            <input
              value={escalatePhone}
              onChange={(e) => setEscalatePhone(e.target.value)}
              placeholder="Phone (optional)"
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />
          </div>
          <textarea
            value={escalateNote}
            onChange={(e) => setEscalateNote(e.target.value)}
            placeholder="Note for the School Admin (optional)"
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
          />
          <div className="flex gap-3 text-xs">
            <button type="submit" disabled={submitting} className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50">
              Escalate to School Admin
            </button>
            <button type="button" onClick={() => setMode("pick")} className="text-slate-500">
              Back
            </button>
          </div>
        </form>
      )}

      {mode === "escalate" && escalated && (
        <div className="space-y-2">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Escalation sent to the School Admin. This pupil remains not dismissed until it&apos;s resolved.
          </p>
          <button onClick={onCancel} className="text-xs text-slate-500">
            Close
          </button>
        </div>
      )}
    </div>
  );
}
