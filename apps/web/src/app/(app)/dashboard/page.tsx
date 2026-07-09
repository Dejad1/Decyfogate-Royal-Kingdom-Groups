"use client";

import { Role } from "@decyfogate/shared-types";
import { useAuth } from "@/lib/auth-context";
import { SchoolAdminDashboard } from "@/components/dashboards/SchoolAdminDashboard";
import { FormTeacherDashboard } from "@/components/dashboards/FormTeacherDashboard";
import { SubjectTeacherDashboard } from "@/components/dashboards/SubjectTeacherDashboard";

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.role) {
    case Role.SCHOOL_ADMIN:
    case Role.GROUP_ADMIN:
      return <SchoolAdminDashboard />;
    case Role.FORM_TEACHER:
      return <FormTeacherDashboard />;
    case Role.SUBJECT_TEACHER:
      return <SubjectTeacherDashboard />;
    default:
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          There is no web dashboard yet for the <strong>{user.role}</strong> role in this demo. This role is
          modeled in the API (see the brief&apos;s DecyfoTech internal roles) but its dedicated screens are out
          of scope for the current build phase.
        </div>
      );
  }
}
