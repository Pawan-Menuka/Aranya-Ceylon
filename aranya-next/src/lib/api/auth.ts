import { apiFetch, setAccessToken } from "./http";

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

export async function register(input: { name: string; email: string; password: string }): Promise<AuthUser> {
  const data = await apiFetch<AuthResponse>("/auth/register", { method: "POST", body: input });
  if (data.accessToken) setAccessToken(data.accessToken);
  return data.user;
}

export async function refresh(): Promise<boolean> {
  try {
    const data = await apiFetch<{ accessToken: string }>("/auth/refresh", { method: "POST" });
    if (data.accessToken) {
      setAccessToken(data.accessToken);
      return true;
    }
  } catch {
    /* no valid refresh cookie */
  }
  return false;
}

export async function me(): Promise<AuthUser | null> {
  try {
    const data = await apiFetch<{ user: AuthUser }>("/auth/me", { auth: true });
    return data.user;
  } catch {
    return null;
  }
}

export async function patchMe(input: { name?: string; phone?: string }): Promise<AuthUser> {
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
