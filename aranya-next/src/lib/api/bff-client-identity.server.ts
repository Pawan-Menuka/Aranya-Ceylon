import { createHmac } from "node:crypto";
import { isIP } from "node:net";

// Only the controlled private ingress may supply this value. This is not a
// general X-Forwarded-For resolver and must never consume browser metadata.
export function canonicalClientIp(input: string | null): string | null {
  if (!input || input.length > 128 || input.includes(",")) return null;
  const ip = input.trim();
  const family = isIP(ip);
  if (family === 4) return ip;
  if (family !== 6) return null;
  try {
    const canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1).toLowerCase();
    const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(canonical);
    if (!mapped) return canonical;
    const high = parseInt(mapped[1], 16);
    const low = parseInt(mapped[2], 16);
    return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
  } catch { return null; }
}

export function signedBffIdentityHeaders(input: {
  ip: string | null;
  method: string;
  target: string;
  secret: string;
  now?: number;
}): Record<string, string> | null {
  if (typeof window !== "undefined") throw new Error("Server-only identity signer.");
  // Keep the raw secret for signing; both services must configure identical
  // bytes. Whitespace alone must not satisfy the minimum key length.
  if (input.secret.trim().length < 32) throw new Error("Invalid identity configuration.");
  const ip = canonicalClientIp(input.ip);
  if (!ip) return null;
  const now = input.now ?? Date.now();
  if (!Number.isSafeInteger(now) || now <= 0) return null;
  const target = new URL(input.target);
  const method = input.method.toUpperCase();
  if (!/^https?:$/.test(target.protocol) || !/^[A-Z]+$/.test(method)) return null;
  const time = String(now);
  const payload = JSON.stringify([1, time, method, target.pathname + target.search, ip]);
  return {
    "x-aranya-bff-client-ip": ip,
    "x-aranya-bff-client-time": time,
    "x-aranya-bff-client-signature": createHmac("sha256", input.secret).update(payload).digest("base64url"),
  };
}
