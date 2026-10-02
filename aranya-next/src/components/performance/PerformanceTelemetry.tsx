import { telemetryConfig } from "@/lib/performance/telemetry-config.server";

// Server gate: disabled deployments render no client telemetry boundary.
export default async function PerformanceTelemetry() {
  const config = telemetryConfig();
  if (!config.enabled) return null;
  const { default: SampledWebVitals } = await import("./SampledWebVitals");
  return <SampledWebVitals sampleRate={config.sampleRate} />;
}
