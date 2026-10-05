import { publicRouteGroup, vitalEvent, type MetricName, type PublicRouteGroup } from "./telemetry";

// A document reports at most five events. No retries, identifiers, persistent
// storage or third-party destinations. The initial public route is the cohort.
export function createVitalReporter(route: PublicRouteGroup, pathname: () => string, transport: typeof fetch = fetch) {
  const sent = new Set<MetricName>();
  let stopped = false;
  let controller = new AbortController();
  return {
    resume() { stopped = false; if (controller.signal.aborted) controller = new AbortController(); },
    cancel() { stopped = true; controller.abort(); },
    report(metric: { name: string; value: unknown }) {
      if (stopped || !publicRouteGroup(pathname())) return;
      const event = vitalEvent(metric, route);
      if (!event || sent.has(event.name)) return;
      sent.add(event.name);
      // sendBeacon cannot omit cookies or the referrer. Fetch keepalive gives
      // equivalent nonblocking delivery with explicit privacy controls.
      try {
        void transport("/api/performance", {
          method: "POST", mode: "same-origin", credentials: "omit", referrerPolicy: "no-referrer",
          headers: { "content-type": "application/json" }, body: JSON.stringify(event),
          keepalive: true, cache: "no-store", redirect: "error", signal: controller.signal,
        }).catch(() => { /* Telemetry must never affect shopping or emit errors. */ });
      } catch { /* Includes unavailable transport / exhausted keepalive budget. */ }
    },
  };
}
