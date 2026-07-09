"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

interface Escalation {
  id: string;
  attemptedPickupPersonName: string;
  attemptedPickupPersonPhone: string | null;
  note: string | null;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  student: { fullName: string };
  classUnit: { name: string; classLevel: { name: string } };
  reportedByUser: { fullName: string };
}

export function EscalationsPanel({ schoolId }: { schoolId: string }) {
  const { api } = useAuth();
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await api<Escalation[]>(`/dismissal/escalations?schoolId=${schoolId}&status=OPEN`);
    setEscalations(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  async function resolve(id: string) {
    setResolving(id);
    try {
      await api(`/dismissal/escalations/${id}/resolve`, { method: "PATCH" });
      await load();
    } finally {
      setResolving(null);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Checking for open pickup escalations...</p>;

  if (escalations.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No open pickup escalations. These appear when a Form Teacher flags someone collecting a pupil who isn&apos;t
        on the authorized list.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-red-200 bg-white">
      <div className="border-b border-red-100 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-800">
        {escalations.length} open pickup escalation{escalations.length === 1 ? "" : "s"} -- needs review before dismissal
      </div>
      <ul className="divide-y divide-slate-100">
        {escalations.map((e) => (
          <li key={e.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">
                {e.student.fullName} <span className="font-normal text-slate-400">·</span>{" "}
                {e.classUnit.classLevel.name}
                {e.classUnit.name}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Attempted pickup by <span className="font-medium">{e.attemptedPickupPersonName}</span>
                {e.attemptedPickupPersonPhone && ` (${e.attemptedPickupPersonPhone})`}
              </p>
              {e.note && <p className="mt-1 text-xs text-slate-500">&ldquo;{e.note}&rdquo;</p>}
              <p className="mt-1 text-xs text-slate-400">
                Reported by {e.reportedByUser.fullName} · {new Date(e.createdAt).toLocaleTimeString("en-NG")}
              </p>
            </div>
            <button
              onClick={() => resolve(e.id)}
              disabled={resolving === e.id}
              className="shrink-0 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Mark resolved
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
