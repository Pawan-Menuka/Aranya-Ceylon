// Shared, deliberately small wire schema. Never serialize a Web Vitals object:
// its entries/attribution can contain URLs, DOM text and resource identifiers.
export const METRIC_NAMES = ["LCP", "CLS", "INP", "FCP", "TTFB"] as const;
export const PUBLIC_ROUTE_GROUPS = [
  "/", "/products", "/products/[slug]", "/categories", "/categories/[slug]",
  "/journal", "/journal/[slug]", "/recipes", "/recipes/[slug]", "/gifts",
  "/search", "/cart", "/about", "/contact", "/faq", "/cookies",
  "/privacy", "/shipping", "/wholesale", "/terms",
] as const;
export const MAX_TELEMETRY_BYTES = 1024;
export type MetricName = typeof METRIC_NAMES[number];
export type PublicRouteGroup = typeof PUBLIC_ROUTE_GROUPS[number];
export type VitalEvent = {
  version: 1;
  event: "web_vital";
  name: MetricName;
  value: number;
  route: PublicRouteGroup;
};

export function publicRouteGroup(pathname: string): PublicRouteGroup | null {
  if (pathname.length > 2048 || !pathname.startsWith("/") || pathname.startsWith("//")) return null;
  // Caller supplies pathname, but discard query/hash defensively, before lookup.
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/$/, "") || "/";
  if (PUBLIC_ROUTE_GROUPS.includes(path as PublicRouteGroup)) return path as PublicRouteGroup;
  const match = /^\/(products|categories|journal|recipes)\/[^/\\\s]+$/.exec(path);
  return match ? `/${match[1]}/[slug]` as PublicRouteGroup : null;
}

export function metricValue(name: MetricName, value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > (name === "CLS" ? 100 : 600_000)) return null;
  return name === "CLS" ? Math.round(value * 10_000) / 10_000 : Math.round(value);
}

export function vitalEvent(metric: { name: string; value: unknown }, route: PublicRouteGroup): VitalEvent | null {
  if (!METRIC_NAMES.includes(metric.name as MetricName)) return null;
  const name = metric.name as MetricName;
  const value = metricValue(name, metric.value);
  return value === null ? null : { version: 1, event: "web_vital", name, value, route };
}

export function parseVitalEvent(input: unknown): VitalEvent | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 5 || !["version", "event", "name", "value", "route"].every(key => Object.hasOwn(record, key))) return null;
  if (record.version !== 1 || record.event !== "web_vital" || typeof record.name !== "string" || typeof record.route !== "string") return null;
  if (!PUBLIC_ROUTE_GROUPS.includes(record.route as PublicRouteGroup)) return null;
  return vitalEvent({ name: record.name, value: record.value }, record.route as PublicRouteGroup);
}
