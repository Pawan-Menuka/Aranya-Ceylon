// Isomorphic typed fetch core (spec §1 — "no fetch scattered in components").
//
//  • On the SERVER (Server Components / route handlers): talk to the Express
//    API directly and forward the incoming request's cookies via next/headers,
//    so market + auth resolve correctly during dynamic SSR.
//  • In the BROWSER (Client Components): talk to the same-origin BFF (/api/*)
//    with credentials:"include", so HttpOnly cookies ride along and the server
//    proxy (app/api/[...path]/route.ts) injects them upstream.
//
// One de-duplicated refresh on 401 (browser path), then the request replays
// once. Access tokens live in memory only — never localStorage (spec §7.3).

import { RequestFailure, requestTimeoutMs, withRequestDeadline } from "./request-deadline";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const isServer = typeof window === "undefined";

export interface ApiError extends Error {
  status: number;
  payload?: unknown;
}

export function makeError(status: number, payload: unknown): ApiError {
  // The backend reports failures as { error } (some as { message }). Read either
  // so real guidance (e.g. "verify your email") reaches the UI instead of a
  // generic "Request failed (NNN)".
  let msg = "";
  if (payload && typeof payload === "object") {
    const p = payload as { message?: unknown; error?: unknown };
    if (typeof p.message === "string") msg = p.message;
    else if (typeof p.error === "string") msg = p.error;
  }
  const e = new Error(msg || `Request failed (${status})`) as ApiError;
  e.status = status;
  e.payload = payload;
  return e;
}

// ---- in-memory access token (browser only) ----
let accessToken: string | null = null;
export function setAccessToken(t: string | null) {
  accessToken = t;
}
export function getAccessToken() {
  return accessToken;
}

// Single-flight refresh: many parallel 401s share one /auth/refresh call.
let refreshing: Promise<boolean> | null = null;
export async function refreshSession(): Promise<boolean> {
  if (isServer) return false;
  if (!refreshing) {
    refreshing = apiFetch<{ accessToken?: string }>("/auth/refresh", { method: "POST" })
      .then((j) => {
        if (j?.accessToken) setAccessToken(j.accessToken);
        return !!j?.accessToken;
      })
      .catch((error) => {
        // 429 means "not now", not "the API is broken": carry on signed out
        // instead of raising a session error, which would also pause every
        // queued cart write until the visitor pressed retry.
        const status = (error as ApiError).status;
        if (status === 401 || status === 429) return false;
        throw error;
      })
      .finally(() => {
        // release after the microtask so concurrent callers see the result
        setTimeout(() => (refreshing = null), 0);
      });
  }
  return refreshing;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Legacy hints ignored by this private path; public reads use publicApiFetch. */
  revalidate?: number | false;
  tags?: string[];
  auth?: boolean; // attach Bearer token (browser)
  /** End-to-end budget, including response body and auth refresh/replay. */
  timeoutMs?: number;
}

async function serverCookieHeader(): Promise<string> {
  // Dynamically imported so this module is also safe to bundle for the client.
  const { cookies } = await import("next/headers");
  try {
    return cookies().toString();
  } catch {
    return "";
  }
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, revalidate, tags, auth = false, headers, timeoutMs, signal: callerSignal, ...rest } = opts;
  const clean = path.startsWith("/") ? path : `/${path}`;

  return withRequestDeadline(timeoutMs ?? requestTimeoutMs(clean, rest.method?.toUpperCase()), callerSignal, async (signal) => {

    const h = new Headers(headers as HeadersInit);
    if (body !== undefined && !h.has("content-type")) h.set("content-type", "application/json");

    const init: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
      ...rest,
      signal,
      headers: h,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };

    let url: string;
    if (isServer) {
      url = `${API_BASE}${clean}`;
      const cookie = await serverCookieHeader();
      if (cookie) h.set("cookie", cookie);
      // Visitor cookies/auth must never enter the shared Next Data Cache.
      delete init.next;
      init.cache = "no-store";
    } else {
      url = `/api${clean}`; // BFF
      init.credentials = "include";
      init.cache = "no-store";
      if (auth && accessToken) h.set("authorization", `Bearer ${accessToken}`);
    }

    async function perform() {
      try {
        const response = await fetch(url, init);
        const text = await response.text();
        return { response, data: text ? safeJson(text) : null };
      } catch (error) {
        if (signal.aborted) throw signal.reason;
        throw new RequestFailure("The service is unavailable. Please try again.", 502, "api_unreachable");
      }
    }
    let { response: res, data } = await perform();

    // Browser: one refresh + replay on 401.
    if (res.status === 401 && !isServer && auth) {
      const ok = await refreshSession();
      if (ok) {
        if (signal.aborted) throw signal.reason;
        if (accessToken) h.set("authorization", `Bearer ${accessToken}`);
        ({ response: res, data } = await perform());
      }
    }

    if (res.status === 204) return undefined as T;

    if (!res.ok) throw makeError(res.status, data);
    return data as T;
  });
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
