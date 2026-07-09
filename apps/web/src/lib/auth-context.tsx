"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { LoginResponse, UserSummaryDto } from "@decyfogate/shared-types";
import { apiFetch } from "./api-client";

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

interface AuthContextValue {
  user: UserSummaryDto | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  api: <T>(path: string, options?: ApiOptions) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "decyfogate.session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummaryDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as LoginResponse;
        setUser(parsed.user);
        setToken(parsed.token);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiFetch<LoginResponse>("/auth/login", { method: "POST", body: { email, password } });
    setUser(result.user);
    setToken(result.token);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const api = useCallback(
    <T,>(path: string, options?: ApiOptions) => apiFetch<T>(path, { ...options, token }),
    [token]
  );

  return <AuthContext.Provider value={{ user, token, loading, login, logout, api }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
