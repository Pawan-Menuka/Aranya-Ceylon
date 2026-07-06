"use client";

import * as React from "react";
import type { AuthUser } from "@/lib/api/auth";
import { login as apiLogin, register as apiRegister, refresh as apiRefresh, me as apiMe, logout as apiLogout } from "@/lib/api/auth";
import { mergeCart } from "@/lib/api/cart";
import { ACCOUNT } from "@/lib/account-data";
import { DEMO_MODE } from "@/lib/demo";

// Auth context (spec §6/§7.3). Access token lives in memory (lib/api/http.ts);
// the refresh token is an HttpOnly cookie via the BFF. On mount we try a silent
// refresh → /auth/me to restore the session. When the API is unreachable, sign-in
// falls back to a local demo session so the account dashboard stays viewable
// offline (acceptance criterion §11) — flagged via `demo`.

export interface SignInResult { user: AuthUser; demo: boolean }
// Registration doesn't establish a session — the user must verify their email
// first. `pending` means "account created, go verify"; `demo` means the API was
// unreachable and we fell back to a local demo session (already signed in).
export interface SignUpResult { pending: boolean; demo: boolean; message?: string }

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  demo: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (name: string, email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
}

const Ctx = React.createContext<AuthCtx | null>(null);

const DEMO_USER: AuthUser = { id: "demo", name: ACCOUNT.user.name, email: ACCOUNT.user.email, role: "CUSTOMER" };

// Treat "API unreachable" (BFF 502) or a network error as offline → demo mode.
// A real 400/401 from the backend is surfaced to the form. Gated by DEMO_MODE
// so a transient network error in production never silently logs the visitor
// into a fabricated demo account instead of surfacing the failure (BUG-20).
function isOffline(e: unknown): boolean {
  if (!DEMO_MODE) return false;
  const status = (e as { status?: number })?.status;
  return status === undefined || status === 502 || status === 0;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [demo, setDemo] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (await apiRefresh()) {
          const u = await apiMe();
          if (alive && u) setUser(u);
        }
      } catch {
        /* not signed in */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const afterAuth = React.useCallback(async () => {
    // Merge the guest cart into the user cart on login (spec §7.4). Best-effort.
    try {
      await mergeCart();
    } catch {
      /* ignore — guest cart stays as the optimistic client cart */
    }
  }, []);

  const signIn = React.useCallback(async (email: string, password: string): Promise<SignInResult> => {
    try {
      const u = await apiLogin(email, password);
      setUser(u);
      setDemo(false);
      await afterAuth();
      return { user: u, demo: false };
    } catch (e) {
      if (isOffline(e)) {
        const demoUser = { ...DEMO_USER, email: email || DEMO_USER.email };
        setUser(demoUser);
        setDemo(true);
        return { user: demoUser, demo: true };
      }
      throw e;
    }
  }, [afterAuth]);

  const signUp = React.useCallback(async (name: string, email: string, password: string): Promise<SignUpResult> => {
    try {
      const res = await apiRegister({ name, email, password });
      // No session is established — the user must verify their email, then sign
      // in. Surface the pending state so the form can tell them to check inbox.
      return { pending: true, demo: false, message: res.message };
    } catch (e) {
      if (isOffline(e)) {
        setUser({ ...DEMO_USER, name: name || DEMO_USER.name, email: email || DEMO_USER.email });
        setDemo(true);
        return { pending: false, demo: true };
      }
      throw e;
    }
  }, []);

  const signOut = React.useCallback(async () => {
    try {
      if (!demo) await apiLogout();
    } finally {
      setUser(null);
      setDemo(false);
    }
  }, [demo]);

  const value = React.useMemo<AuthCtx>(() => ({ user, loading, demo, signIn, signUp, signOut }), [user, loading, demo, signIn, signUp, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
