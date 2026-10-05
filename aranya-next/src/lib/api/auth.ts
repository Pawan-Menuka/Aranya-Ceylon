import { apiFetch, refreshSession, setAccessToken } from "./http";

// Spec §6 — /auth. The refresh token is an HttpOnly cookie (handled by the BFF);
// the access token comes back in the body and is held in memory only (never
// localStorage — spec §7.3). On login/register/refresh we stash it via
// setAccessToken so subsequent authed calls attach the Bearer header.

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "ADMIN" | "SUPERADMIN";
  verified?: boolean;
  phone?: string | null;
  newsletterOptIn?: boolean;
}

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await apiFetch<AuthResponse>("/auth/login", { method: "POST", body: { email, password } });
  if (data.accessToken) setAccessToken(data.accessToken);
  return data.user;
}

// Registration is deliberately neutral (anti-enumeration): the backend returns
// only { message } and never a session — the user must verify their email, then
// sign in. So register() surfaces that pending state rather than a user/token.
export interface RegisterResult {
  pending: true;
  message: string;
}
export async function register(input: { name: string; email: string; password: string }): Promise<RegisterResult> {
  const data = await apiFetch<{ message?: string }>("/auth/register", { method: "POST", body: input });
  return { pending: true, message: data.message ?? "Check your email to verify your account." };
}

// Request a fresh verification link. Neutral by design — resolves on any 2xx,
// never reveals whether the account exists or is already verified.
export async function resendVerification(email: string): Promise<{ message: string }> {
  return apiFetch("/auth/resend-verification", { method: "POST", body: { email } });
}

// Request a password-reset link. Neutral by design (anti-enumeration) — the
// backend always returns the same message regardless of whether the email
// is registered.
export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiFetch("/auth/forgot-password", { method: "POST", body: { email } });
}

// Consume a reset token and set a new password. Ends every other session
// server-side, so the caller should route back to sign-in afterward rather
// than assume the user is still authenticated anywhere.
export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return apiFetch("/auth/reset-password", { method: "POST", body: { token, password } });
}

// The API sets this readable marker alongside the HttpOnly refresh cookie and
// clears them together. Without it this browser has no session to restore, so
// the boot-time refresh is skipped: anonymous page loads no longer spend a
// rate-limited POST /auth/refresh just to learn they are signed out.
const SESSION_HINT_COOKIE = /(?:^|;\s*)aranya_session=/;
function hasSessionHint(): boolean {
  return typeof document !== "undefined" && SESSION_HINT_COOKIE.test(document.cookie);
}

export async function refresh(): Promise<boolean> {
  if (!hasSessionHint()) return false;
  return refreshSession();
}

export async function me(options: { signal?: AbortSignal } = {}): Promise<AuthUser | null> {
  try {
    const data = await apiFetch<{ user: AuthUser }>("/auth/me", { auth: true, ...options });
    return data.user;
  } catch (error) {
    if ((error as { status?: number }).status !== 401) throw error;
    return null;
  }
}

export async function patchMe(input: { name?: string; phone?: string; newsletterOptIn?: boolean }): Promise<AuthUser> {
  const data = await apiFetch<{ user: AuthUser }>("/auth/me", { method: "PATCH", body: input, auth: true });
  return data.user;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST", auth: true });
  } finally {
    setAccessToken(null);
  }
}

export interface SavedAddress {
  id: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
}

export function getAddresses(): Promise<{ addresses: SavedAddress[] }> {
  return apiFetch("/auth/me/addresses", { auth: true });
}

export function createAddress(input: Omit<SavedAddress, "id">): Promise<{ address: SavedAddress }> {
  return apiFetch("/auth/me/addresses", { method: "POST", body: input, auth: true });
}

export function updateAddress(id: string, input: Partial<Omit<SavedAddress, "id">>): Promise<{ address: SavedAddress }> {
  return apiFetch(`/auth/me/addresses/${encodeURIComponent(id)}`, { method: "PATCH", body: input, auth: true });
}

export function deleteAddress(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/auth/me/addresses/${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
}
