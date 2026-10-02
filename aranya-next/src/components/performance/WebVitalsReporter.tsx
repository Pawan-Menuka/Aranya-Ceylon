"use client";

import { useEffect, useMemo } from "react";
import { useReportWebVitals } from "next/web-vitals";
import { createVitalReporter } from "@/lib/performance/telemetry-client";
import type { PublicRouteGroup } from "@/lib/performance/telemetry";

export default function WebVitalsReporter({ route }: { route: PublicRouteGroup }) {
  const reporter = useMemo(() => createVitalReporter(route, () => window.location.pathname), [route]);
  useReportWebVitals(reporter.report);
  useEffect(() => { reporter.resume(); return () => reporter.cancel(); }, [reporter]);
  return null;
}
