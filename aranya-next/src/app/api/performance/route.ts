import { telemetryConfig } from "@/lib/performance/telemetry-config.server";
import { MAX_TELEMETRY_BYTES, parseVitalEvent } from "@/lib/performance/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Global per-worker budget deliberately avoids retaining IPs, cookies or IDs.
let windowStarted = 0;
let requests = 0;
function available(limit: number) {
  const now = Date.now();
  if (now - windowStarted >= 60_000) { windowStarted = now; requests = 0; }
  if (requests >= limit) return false;
  requests++;
  return true;
}
function reply(status: number) {
  return new Response(null, { status, headers: { "cache-control": "no-store", ...(status === 429 ? { "retry-after": "60" } : {}) } });
}

async function boundedBody(req: Request): Promise<string> {
  if (req.signal.aborted) throw new Error("cancelled");
  if (!req.body) throw new Error("invalid");
  const reader = req.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  const interrupted = new Promise<never>((_, reject) => {
    abort = () => reject(new Error("cancelled"));
    req.signal.addEventListener("abort", abort, { once: true });
    timer = setTimeout(() => reject(new Error("timeout")), 1000);
  });
  try {
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { value, done } = await Promise.race([reader.read(), interrupted]);
      if (done) break;
      bytes += value.byteLength;
      // Also bound pathological zero/tiny-chunk streams independently of bytes.
      if (bytes > MAX_TELEMETRY_BYTES || chunks.length >= 64) throw new Error("large");
      chunks.push(value);
    }
    const joined = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder("utf-8", { fatal: true }).decode(joined);
  } finally {
    clearTimeout(timer);
    if (abort) req.signal.removeEventListener("abort", abort);
    void reader.cancel().catch(() => {});
  }
}

export async function POST(req: Request): Promise<Response> {
  const config = telemetryConfig();
  if (!config.enabled) return reply(404);
  if (req.method !== "POST") return reply(405);
  // Origin is a server-configured literal, not a request host/forwarded header.
  // No permissive CORS and no authentication/cookie parsing on this endpoint.
  if (req.headers.get("origin") !== config.origin || req.headers.get("sec-fetch-site") !== "same-origin") return reply(403);
  if (!available(config.requestsPerMinute)) return reply(429);
  if (req.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") return reply(415);
  const length = req.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_TELEMETRY_BYTES)) return reply(413);
  try {
    const event = parseVitalEvent(JSON.parse(await boundedBody(req)));
    if (!event || req.signal.aborted) return reply(400);
    // Log only the reconstructed allowlist schema; never log request/body/errors.
    console.info(JSON.stringify(event));
    return reply(204);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid";
    return reply(message === "large" ? 413 : message === "timeout" ? 408 : message === "cancelled" ? 499 : 400);
  }
}

// Explicit rejects keep every method local instead of falling into the BFF.
export function GET() { return reply(405); }
export function HEAD() { return reply(405); }
export function OPTIONS() { return reply(405); }
export function PUT() { return reply(405); }
export function PATCH() { return reply(405); }
export function DELETE() { return reply(405); }
