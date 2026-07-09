"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ClassLevelSummary } from "./types";

type Scope = "GROUP" | "SCHOOL" | "LEVEL" | "UNIT";

export function BroadcastForm({ schoolId, canTargetGroup }: { schoolId: string; canTargetGroup: boolean }) {
  const { api } = useAuth();
  const [scope, setScope] = useState<Scope>("SCHOOL");
  const [levels, setLevels] = useState<ClassLevelSummary[]>([]);
  const [classLevelId, setClassLevelId] = useState("");
  const [classUnitId, setClassUnitId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ClassLevelSummary[]>(`/directory/schools/${schoolId}/class-levels`).then(setLevels);
  }, [api, schoolId]);

  const unitsForSelectedLevel = levels.find((l) => l.id === classLevelId)?.units ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const body: Record<string, unknown> = { scope, message };
      if (scope === "SCHOOL") body.schoolId = schoolId;
      if (scope === "LEVEL") body.classLevelId = classLevelId;
      if (scope === "UNIT") body.classUnitId = classUnitId;

      const res = await api<{ recipients: number }>("/notifications/broadcast", { method: "POST", body });
      setResult(`Queued for ${res.recipients} guardian${res.recipients === 1 ? "" : "s"}.`);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send broadcast");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Audience</label>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as Scope)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {canTargetGroup && <option value="GROUP">Whole group (both schools)</option>}
          <option value="SCHOOL">This school</option>
          <option value="LEVEL">One level</option>
          <option value="UNIT">One class unit</option>
        </select>
      </div>

      {scope === "LEVEL" && (
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Level</label>
          <select
            value={classLevelId}
            onChange={(e) => setClassLevelId(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select a level</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {scope === "UNIT" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Level</label>
            <select
              value={classLevelId}
              onChange={(e) => {
                setClassLevelId(e.target.value);
                setClassUnitId("");
              }}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select a level</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Unit</label>
            <select
              value={classUnitId}
              onChange={(e) => setClassUnitId(e.target.value)}
              required
              disabled={!classLevelId}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            >
              <option value="">Select a unit</option>
              {unitsForSelectedLevel.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          maxLength={480}
          rows={4}
          placeholder="e.g. School will close by 1pm today due to the public holiday tomorrow."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {result && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{result}</p>}

      <button
        type="submit"
        disabled={sending}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send broadcast"}
      </button>
    </form>
  );
}
