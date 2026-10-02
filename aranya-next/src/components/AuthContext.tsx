"use client";

import * as React from "react";
import type { AuthUser } from "@/lib/api/auth";
import { login as apiLogin, register as apiRegister, refresh as apiRefresh, me as apiMe, logout as apiLogout } from "@/lib/api/auth";
import { mergeCart, waitForCartMutations } from "@/lib/api/cart";
import { ACCOUNT } from "@/lib/account-data";
import { DEMO_MODE } from "@/lib/demo";
import { withRequestDeadline } from "@/lib/api/request-deadline";

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
  sessionError: string | null;
  sessionRevision: number;
  retrySession: () => void;
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
  const [sessionError, setSessionError] = React.useState<string | null>(null);
  const [restoreRevision, setRestoreRevision] = React.useState(0);
  const [sessionRevision, setSessionRevision] = React.useState(0);
  const operationRef = React.useRef(0);
  const restoreAbortRef = React.useRef<AbortController | null>(null);
  const restoreRefreshRef = React.useRef<Promise<boolean> | null>(null);
  const restoreWorkRef = React.useRef<Promise<void> | null>(null);
  const retrySession = React.useCallback(() => setRestoreRevision(n => n + 1), []);

  React.useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const operation = ++operationRef.current;
    restoreAbortRef.current = controller;
    const current = () => alive && operationRef.current === operation;
    setLoading(true);
    setSessionError(null);
    restoreWorkRef.current = (async () => {
      try {
        await withRequestDeadline(10000, controller.signal, async (signal) => {
          const refresh = apiRefresh();
          restoreRefreshRef.current = refresh;
          if (await refresh) {
            if (signal.aborted) throw signal.reason;
            const u = await apiMe({ signal });
            if (current()) setUser(u);
          } else if (current()) {
            setUser(null);
          }
        });
      } catch {
        if (current()) setSessionError("We couldn't check your session. Please try again.");
      } finally {
        if (current()) setLoading(false);
      }
    })();
    return () => { alive = false; controller.abort(); };
  }, [restoreRevision]);

  const afterAuth = React.useCallback(async () => {
    // Merge the guest cart into the user cart on login (spec §7.4). Best-effort.
    try {
      await mergeCart();
    } catch {
      /* ignore — guest cart stays as the optimistic client cart */
    }
  }, []);

  const signIn = React.useCallback(async (email: string, password: string): Promise<SignInResult> => {
    await restoreWorkRef.current;
    await waitForCartMutations();
    const operation = ++operationRef.current;
    restoreAbortRef.current?.abort();
    setLoading(true);
    try {
      // Await the already-started refresh; never launch another refresh for login.
      // Its token result must settle before login installs the new access token.
      await restoreRefreshRef.current?.catch(() => false);
      // Queued guest writes drained before loading was set; do not deadlock the
      // provider's auth-ready gate by trying to drain after pausing its session.
      const u = await apiLogin(email, password);
      await afterAuth();
      if (operationRef.current === operation) {
        setUser(u);
        setDemo(false);
        setSessionError(null);
        setSessionRevision(n => n + 1);
      }
      return { user: u, demo: false };
    } catch (e) {
      if (isOffline(e) && operationRef.current === operation) {
        const demoUser = { ...DEMO_USER, email: email || DEMO_USER.email };
        setUser(demoUser);
        setDemo(true);
        setSessionError(null);
        setSessionRevision(n => n + 1);
        return { user: demoUser, demo: true };
      }
      throw e;
    } finally {
      if (operationRef.current === operation) setLoading(false);
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
        operationRef.current += 1;
        restoreAbortRef.current?.abort();
        setUser({ ...DEMO_USER, name: name || DEMO_USER.name, email: email || DEMO_USER.email });
        setDemo(true);
        setSessionError(null);
        setSessionRevision(n => n + 1);
        setLoading(false);
        return { pending: false, demo: true };
      }
      throw e;
    }
  }, []);

  const signOut = React.useCallback(async () => {
    await restoreWorkRef.current;
    await waitForCartMutations();
    const operation = ++operationRef.current;
    restoreAbortRef.current?.abort();
    setLoading(true);
    let failed = false;
    try {
      await restoreRefreshRef.current?.catch(() => false);
      if (!demo) await apiLogout();
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      if (operationRef.current === operation) {
        setUser(null);
        setDemo(false);
        setSessionError(failed ? "We couldn't finish signing out. Please try again." : null);
        setSessionRevision(n => n + 1);
        setLoading(false);
      }
    }
  }, [demo]);

  const value = React.useMemo<AuthCtx>(() => ({ user, loading, demo, sessionError, sessionRevision, retrySession, signIn, signUp, signOut }), [user, loading, demo, sessionError, sessionRevision, retrySession, signIn, signUp, signOut]);
  return React.createElement(Ctx.Provider, { value }, children);
}

export function useAuth(): AuthCtx {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
