"use client";

import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { roleLabel } from "@/lib/roles";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-slate-900 text-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-400/10 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/30">
              DG
            </div>
            <span className="text-sm font-semibold tracking-tight">DecyfoGate</span>
          </div>
          {user && (
            <div className="flex items-center gap-4 text-sm">
              <div className="text-right leading-tight">
                <p className="font-medium text-white">{user.fullName}</p>
                <p className="text-xs text-slate-400">{roleLabel(user.role)}</p>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
