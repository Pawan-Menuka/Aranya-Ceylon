import "server-only";
import { cookies } from "next/headers";

// The access token (aranya_access) is an HttpOnly JWT carrying { userId, role }.
// For admin UX-gating we decode the role WITHOUT verifying the signature — this
// only decides whether to render the shell or redirect. Every admin API call is
// still enforced server-side by the backend (requireRole), so a forged cookie
// buys nothing but a blank shell. See lib/api/auth-proxy.ts for the real path.
const ACCESS = "aranya_access";
const ADMIN_ROLES = ["ADMIN", "SUPERADMIN"];

function decodeRole(jwt: string): string | null {
  try {
    const seg = jwt.split(".")[1] ?? "";
    const json = Buffer.from(seg.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const { role } = JSON.parse(json) as { role?: string };
    return role ?? null;
  } catch {
    return null;
  }
}

// Role from the access cookie, or null when no session cookie is present.
export async function getSessionRole(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(ACCESS)?.value;
  if (!token) return null;
  return decodeRole(token);
}

export function isAdminRole(role: string | null): role is "ADMIN" | "SUPERADMIN" {
  return role !== null && ADMIN_ROLES.includes(role);
}
