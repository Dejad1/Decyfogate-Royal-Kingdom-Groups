"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ClassLevelSummary } from "./types";

export function EnrollStudentForm({ schoolId }: { schoolId: string }) {
  const { api } = useAuth();
  const [levels, setLevels] = useState<ClassLevelSummary[]>([]);
  const [classLevelId, setClassLevelId] = useState("");
  const [classUnitId, setClassUnitId] = useState("");
  const [fullName, setFullName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [relationship, setRelationship] = useState("Mother");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    api<ClassLevelSummary[]>(`/directory/schools/${schoolId}/class-levels`).then(setLevels);
  }, [api, schoolId]);

  const unitsForSelectedLevel = levels.find((l) => l.id === classLevelId)?.units ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await api("/directory/students", {
        method: "POST",
        body: {
          classUnitId,
          fullName,
          admissionNumber,
          dateOfBirth,
          gender,
          guardians: [{ fullName: guardianName, phone: guardianPhone, relationship, isPrimary: true }],
        },
      });
      setSuccess(`${fullName} enrolled successfully.`);
      setFullName("");
      setAdmissionNumber("");
      setDateOfBirth("");
      setGuardianName("");
      setGuardianPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enroll student");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
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

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Full name</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Admission no.</label>
          <input
            value={admissionNumber}
            onChange={(e) => setAdmissionNumber(e.target.value)}
            required
            placeholder="RKN/26/0826"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Date of birth</label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Primary guardian</p>
        <div className="grid grid-cols-3 gap-3">
          <input
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
            required
            placeholder="Full name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={guardianPhone}
            onChange={(e) => setGuardianPhone(e.target.value)}
            required
            placeholder="Phone number"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option>Mother</option>
            <option>Father</option>
            <option>Guardian</option>
          </select>
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        {submitting ? "Enrolling..." : "Enroll student"}
      </button>
      <p className="text-xs text-slate-400">
        Single enrollment only in this demo build. Bulk CSV import is scoped for a later phase.
      </p>
    </form>
  );
}
