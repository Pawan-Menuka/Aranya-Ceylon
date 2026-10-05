import { afterEach, expect, it, vi } from "vitest";
import { beginPublicReadMetric, publicReadResource } from "../../aranya-next/src/lib/performance/public-read-metrics.server";

afterEach(() => vi.unstubAllEnvs());
it("is off by default and with malformed or zero rates", () => {
  vi.stubEnv("PUBLIC_READ_METRICS_ENABLED", "false");
  expect(beginPublicReadMetric("/products", true)).toBeUndefined();
  for (const rate of [0, -1, 2, NaN]) expect(beginPublicReadMetric("/products", true, { rate, now: vi.fn(), random: () => 0, emit: vi.fn() })).toBeUndefined();
});
it("emits a bounded coarse event once without input identifiers", () => {
  const emit = vi.fn(); let clock = 0;
  const end = beginPublicReadMetric("/products/customer-secret?email=person@example.invalid", true, { rate: 1, now: () => clock, random: () => 0, emit });
  clock = 22.56; end!(200, "complete"); end!(503, "failed");
  expect(emit).toHaveBeenCalledExactlyOnceWith({ event: "server_public_read", resource: "products.detail", policy: "shared-revalidate", status: 200, outcome: "complete", duration_ms: 22.6 });
  expect(JSON.stringify(emit.mock.calls)).not.toMatch(/customer-secret|email|person@/);
});
it("samples without a timer and reports failures without leaking their errors", () => {
  const now = vi.fn(() => 0), emit = vi.fn();
  expect(beginPublicReadMetric("/products", true, { rate: 0.1, now, random: () => 0.8, emit })).toBeUndefined();
  expect(now).not.toHaveBeenCalled();
  const end = beginPublicReadMetric("/blog/secret", false, { rate: 1, now, random: () => 0, emit });
  end!(0, "cancelled");
  expect(emit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ resource: "blog.detail", policy: "no-store", status: 0, outcome: "cancelled" }));
});
it("retains a finite resource vocabulary and tolerates a failed sink", () => {
  expect(publicReadResource("/someone@example.invalid?secret=value")).toBe("other");
  const end = beginPublicReadMetric("/recipes?secret=value", true, { rate: 1, now: () => 0, random: () => 0, emit: () => { throw new Error("offline"); } });
  expect(() => end!(500, "failed")).not.toThrow();
});
