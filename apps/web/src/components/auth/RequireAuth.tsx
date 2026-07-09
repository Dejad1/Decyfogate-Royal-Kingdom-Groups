"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@decyfogate/shared-types";
import { useAuth } from "@/lib/auth-context";

export function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [loading, user, roles, router]);

  const authorized = !loading && user && (!roles || roles.includes(user.role));

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}
