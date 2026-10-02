// One budget covers headers, body consumption and any authorized auth replay.
// A caller can cancel its own request without cancelling a shared token refresh.
export class RequestFailure extends Error {
  constructor(message: string, public status: number, public code: string) {
    super(message);
    this.name = code === "request_cancelled" ? "AbortError" : "RequestFailure";
  }
}

export function requestTimeoutMs(path: string, method = "GET", upstream = false): number {
  const clean = path.split("?")[0].replace(/^\/api(?=\/)/, "");
  const read = method === "GET" || method === "HEAD";
  if (clean === "/auth/refresh" || (read && clean === "/auth/me")) return upstream ? 4000 : 5000;
  if (!read && /\/(upload|images)(\/|$)/.test(clean)) return 120000;
  if (!read && (/^\/checkout(\/|$)/.test(clean) || /\/refund$/.test(clean))) return 60000;
  return read ? (upstream ? 8000 : 10000) : 15000;
}

export async function withRequestDeadline<T>(
  timeoutMs: number,
  caller: AbortSignal | null | undefined,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RangeError("Request deadline must be positive.");
  const controller = new AbortController();
  const cancel = () => controller.abort(new RequestFailure("Request cancelled.", 0, "request_cancelled"));
  if (caller?.aborted) cancel();
  else caller?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => controller.abort(new RequestFailure(
    "This request took too long. Please try again.", 504, "request_timeout",
  )), timeoutMs);
  let rejectAbort: () => void = () => {};
  try {
    if (controller.signal.aborted) throw controller.signal.reason;
    const aborted = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener("abort", rejectAbort, { once: true });
    });
    // The race also bounds operations whose implementations ignore AbortSignal.
    return await Promise.race([operation(controller.signal), aborted]);
  } finally {
    clearTimeout(timer);
    caller?.removeEventListener("abort", cancel);
    controller.signal.removeEventListener("abort", rejectAbort);
  }
}
