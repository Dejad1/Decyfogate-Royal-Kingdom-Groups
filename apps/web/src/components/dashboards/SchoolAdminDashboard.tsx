"use client";

import { useEffect, useState } from "react";
import { Role } from "@decyfogate/shared-types";
import { useAuth } from "@/lib/auth-context";
import { ClassStructurePanel } from "./admin/ClassStructurePanel";
import { StaffPanel } from "./admin/StaffPanel";
import { EnrollStudentForm } from "./admin/EnrollStudentForm";
import { AttendanceReportPanel } from "./admin/AttendanceReportPanel";
import { LowAttendanceFlagsPanel } from "./admin/LowAttendanceFlagsPanel";
import { BroadcastForm } from "./admin/BroadcastForm";
import { BehaviorAlertsPanel } from "./admin/BehaviorAlertsPanel";
import { NotificationsPanel } from "./NotificationsPanel";

interface SchoolSummary {
  id: string;
  name: string;
  type: "NURSERY_PRIMARY" | "SECONDARY";
}

type Tab = "structure" | "staff" | "enroll" | "report" | "flags" | "broadcast" | "notifications" | "behavior";

const TABS: { id: Tab; label: string }[] = [
  { id: "structure", label: "Class structure" },
  { id: "staff", label: "Staff" },
  { id: "enroll", label: "Enroll student" },
  { id: "report", label: "Attendance report" },
  { id: "flags", label: "Low-attendance flags" },
  { id: "broadcast", label: "Broadcast" },
  { id: "notifications", label: "Notifications" },
  { id: "behavior", label: "Safeguarding & digest" },
];

export function SchoolAdminDashboard() {
  const { api, user } = useAuth();
  const [schools, setSchools] = useState<SchoolSummary[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("structure");

  useEffect(() => {
    api<SchoolSummary[]>("/directory/schools").then((data) => {
      setSchools(data);
      setSchoolId((prev) => prev ?? data[0]?.id ?? null);
    });
  }, [api]);

  if (!schoolId) return <p className="text-sm text-slate-500">Loading schools...</p>;

  const isGroupAdmin = user?.role === Role.GROUP_ADMIN;
  const schoolType = schools.find((s) => s.id === schoolId)?.type ?? "NURSERY_PRIMARY";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
            {isGroupAdmin ? "Group Admin" : "School Admin"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {schools.find((s) => s.id === schoolId)?.name}
          </h1>
        </div>
        {schools.length > 1 && (
          <select
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-3.5 py-2 text-sm font-medium transition ${
              tab === t.id ? "border-b-2 border-slate-900 text-slate-900" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "structure" && <ClassStructurePanel schoolId={schoolId} />}
        {tab === "staff" && <StaffPanel schoolId={schoolId} />}
        {tab === "enroll" && <EnrollStudentForm schoolId={schoolId} />}
        {tab === "report" && <AttendanceReportPanel schoolId={schoolId} />}
        {tab === "flags" && <LowAttendanceFlagsPanel schoolId={schoolId} />}
        {tab === "broadcast" && <BroadcastForm schoolId={schoolId} canTargetGroup={isGroupAdmin} />}
        {tab === "notifications" && <NotificationsPanel schoolId={schoolId} />}
        {tab === "behavior" && <BehaviorAlertsPanel schoolId={schoolId} schoolType={schoolType} />}
      </div>
    </div>
  );
}
