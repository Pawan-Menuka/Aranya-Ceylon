import { cookies } from "next/headers";
import { apiUrl } from "../env";

// Session lives in HttpOnly app-domain cookies — the client never sees tokens
// (closes the prototype's localStorage XSS exposure). aranya_access carries the
// short-lived access token (sent as Bearer); refreshToken is the rotating
// refresh token used to mint new access tokens.
const ACCESS = "aranya_access";
const REFRESH = "refreshToken";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

const baseCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

// Pull the rotating refreshToken out of a backend Set-Cookie and re-emit it on
// our domain (the backend scopes it to /auth/refresh on its own host).
function reemitRefresh(store: CookieStore, res: Response) {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  const rt = setCookies.find((c) => c.startsWith(`${REFRESH}=`));
  if (rt) {
    const value = rt.split(";")[0]!.slice(`${REFRESH}=`.length);
    store.set(REFRESH, value, { ...baseCookie, maxAge: 7 * 24 * 60 * 60 });
  }
}

export function setAccess(store: CookieStore, accessToken: string) {
  store.set(ACCESS, accessToken, { ...baseCookie, maxAge: 7 * 24 * 60 * 60 });
}

export function clearSession(store: CookieStore) {
  store.delete(ACCESS);
  store.delete(REFRESH);
}

// Persist a fresh login/refresh response: { accessToken } in body + refresh
// cookie in the backend response headers.
export function persistSession(store: CookieStore, accessToken: string, res: Response) {
  setAccess(store, accessToken);
  reemitRefresh(store, res);
}

// Use the refresh cookie to mint a new access token. Returns the new token or
// null (and clears the session) if refresh fails. Single call — not for loops.
async function tryRefresh(store: CookieStore): Promise<string | null> {
  const refresh = store.get(REFRESH)?.value;
  if (!refresh) return null;
  let res: Response;
  try {
    res = await fetch(apiUrl("/auth/refresh"), {
      method: "POST",
      headers: { Accept: "application/json", Cookie: `${REFRESH}=${refresh}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return null;
  }
  if (!res.ok) {
    clearSession(store);
    return null;
  }
  const data = (await res.json().catch(() => ({}))) as { accessToken?: string };
  if (!data.accessToken) {
    clearSession(store);
    return null;
  }
  persistSession(store, data.accessToken, res);
  return data.accessToken;
}

// Is the access JWT expired (or within 5s of it)? Decodes the payload without
// verifying — display/timing only; the backend always verifies the signature.
function isExpired(jwt: string): boolean {
  try {
    const seg = jwt.split(".")[1] ?? "";
    const json = Buffer.from(seg.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const { exp } = JSON.parse(json) as { exp?: number };
    return typeof exp === "number" ? exp * 1000 < Date.now() + 5000 : false;
  } catch {
    return false;
  }
}

// Returns a non-expired access token, proactively refreshing if the current one
// has expired (needed because cart/checkout use optionalAuth — an expired token
// there silently degrades to a guest session rather than returning 401).
export async function getValidAccessToken(store: CookieStore): Promise<string | undefined> {
  const access = store.get(ACCESS)?.value;
  if (access && !isExpired(access)) return access;
  if (!store.get(REFRESH)?.value) return access ?? undefined; // no session to refresh
  const refreshed = await tryRefresh(store);
  return refreshed ?? access ?? undefined;
}

// Authenticated backend call. Sends a (proactively refreshed) Bearer, and still
// retries once on a 401. Used by route handlers (which can set cookies).
export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const store = await cookies();
  const token = await getValidAccessToken(store);

  const call = (t: string | undefined) =>
    fetch(apiUrl(path), {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(init.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

  let res = await call(token);
  if (res.status === 401) {
    const refreshed = await tryRefresh(store);
    if (refreshed) res = await call(refreshed);
  }
  return res;
}
