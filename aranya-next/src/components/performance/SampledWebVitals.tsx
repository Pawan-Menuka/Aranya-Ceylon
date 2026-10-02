"use client";

import { useEffect, useState, type ComponentType } from "react";
import { publicRouteGroup, type PublicRouteGroup } from "@/lib/performance/telemetry";

export default function SampledWebVitals({ sampleRate }: { sampleRate: number }) {
  const [reporter, setReporter] = useState<{ Component: ComponentType<{ route: PublicRouteGroup }>; route: PublicRouteGroup } | null>(null);
  useEffect(() => {
    const route = publicRouteGroup(window.location.pathname);
    const privacy = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (!route || privacy.globalPrivacyControl || privacy.doNotTrack === "1" || Math.random() >= sampleRate) return;
    let active = true;
    void import("./WebVitalsReporter").then(({ default: Component }) => {
      if (active) setReporter({ Component, route });
    }).catch(() => { /* Metrics are optional even if the chunk fails to load. */ });
    return () => { active = false; };
  }, [sampleRate]);
  return reporter ? <reporter.Component route={reporter.route} /> : null;
}
