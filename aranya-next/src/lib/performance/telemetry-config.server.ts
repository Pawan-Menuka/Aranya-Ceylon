export type TelemetryConfig = { enabled: boolean; sampleRate: number; origin: string | null; requestsPerMinute: number };

export function telemetryConfig(): TelemetryConfig {
  let origin: string | null = null;
  try {
    const url = new URL(process.env.PERFORMANCE_TELEMETRY_ORIGIN || "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol === "https:" || (local && url.protocol === "http:")) && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash) origin = url.origin;
  } catch { /* Missing/invalid origin fails closed. */ }
  const rawRate = process.env.PERFORMANCE_TELEMETRY_SAMPLE_RATE;
  const rate = rawRate === undefined ? 0.1 : Number(rawRate);
  const sampleRate = Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : 0;
  const rawLimit = process.env.PERFORMANCE_TELEMETRY_REQUESTS_PER_MINUTE;
  const limit = rawLimit === undefined ? 120 : Number(rawLimit);
  const requestsPerMinute = Number.isInteger(limit) && limit >= 1 && limit <= 600 ? limit : 120;
  return { enabled: process.env.PERFORMANCE_TELEMETRY_ENABLED === "true" && !!origin && sampleRate > 0, sampleRate, origin, requestsPerMinute };
}
