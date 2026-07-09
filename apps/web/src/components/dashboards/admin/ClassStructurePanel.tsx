"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ClassLevelSummary } from "./types";

export function ClassStructurePanel({ schoolId }: { schoolId: string }) {
  const { api } = useAuth();
  const [levels, setLevels] = useState<ClassLevelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<ClassLevelSummary[]>(`/directory/schools/${schoolId}/class-levels`)
      .then((data) => !cancelled && setLevels(data))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [api, schoolId]);

  if (loading) return <p className="text-sm text-slate-500">Loading class structure...</p>;

  const totalUnits = levels.reduce((sum, l) => sum + l.units.length, 0);
  const totalStudents = levels.reduce((sum, l) => sum + l.units.reduce((s, u) => s + u._count.students, 0), 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {levels.length} levels · {totalUnits} class units · {totalStudents} pupils
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {levels.map((level) => (
          <div key={level.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">{level.name}</h3>
            <ul className="mt-3 space-y-2">
              {level.units.map((unit) => (
                <li key={unit.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">
                    {level.name}
                    {unit.name}
                  </span>
                  <span className="text-right text-xs text-slate-500">
                    {unit.formTeacher ? unit.formTeacher.fullName : "No form teacher"} · {unit._count.students} pupils
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
