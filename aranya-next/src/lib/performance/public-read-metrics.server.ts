const resources = ["products", "categories", "blog", "recipes", "gifts"] as const;
type Resource = `${typeof resources[number]}.list` | `${typeof resources[number]}.detail` | "other";
type Outcome = "complete" | "failed" | "cancelled";

export function publicReadResource(path: string): Resource {
  const pathname = path.split(/[?#]/, 1)[0];
  const match = /^\/(products|categories|blog|recipes|gifts)(?:\/[^/]+)?\/?$/.exec(pathname);
  if (!match) return "other";
  const resource = match[1] as typeof resources[number];
  const detail = pathname.split("/").filter(Boolean).length > 1;
  return `${resource}.${detail ? "detail" : "list"}`;
}

// Measures logical Next public reads, including cached fetch/body handling.
// Next does not expose a reliable hit/miss flag here: policy is configuration,
// not proof of a cache hit. Never emit the path, query, cookie or cache key.
export function beginPublicReadMetric(path: string, shared: boolean, options?: {
  rate: number; now: () => number; random: () => number; emit: (event: object) => void;
}): ((status: number, outcome: Outcome) => void) | undefined {
  if (typeof window !== "undefined") return undefined;
  if (!options && process.env.PUBLIC_READ_METRICS_ENABLED !== "true") return undefined;
  const rate = options?.rate ?? Number(process.env.PUBLIC_READ_METRICS_SAMPLE_RATE ?? "0.1");
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1 || (options?.random ?? Math.random)() >= rate) return undefined;
  const now = options?.now ?? (() => performance.now());
  const started = now();
  const resource = publicReadResource(path);
  const emit = options?.emit ?? ((event: object) => console.info(JSON.stringify(event)));
  let ended = false;
  return (status, outcome) => {
    if (ended) return;
    ended = true;
    const elapsed = now() - started;
    if (!Number.isFinite(elapsed) || elapsed < 0) return;
    try {
      emit({ event: "server_public_read", resource, policy: shared ? "shared-revalidate" : "no-store",
        status: Number.isInteger(status) && status >= 100 && status <= 599 ? status : 0,
        outcome, duration_ms: Math.round(Math.min(elapsed, 3_600_000) * 10) / 10 });
    } catch { /* Metrics never change public read results. */ }
  };
}
