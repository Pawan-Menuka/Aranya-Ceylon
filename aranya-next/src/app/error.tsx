"use client";

import * as React from "react";
import Link from "next/link";
import { SiteChrome } from "@/components/SiteChrome";
import { Reveal } from "@/components/primitives/Reveal";
import { Liyawel } from "@/components/primitives/Motif";
import { useMarket } from "@/components/MarketContext";

// Route-segment error boundary (App Router). Catches any thrown error below
// the root layout — e.g. a page that hits the API when it's unreachable and
// doesn't have its own try/catch fallback (DEPLOY_READINESS_PLAN #0.1/#0.2).
// Without this, Next renders its own unbranded "Application error" screen.
// Root layout (fonts, CommerceProvider) still renders around this, so
// useMarket()/SiteChrome are safe here — global-error.tsx is the one that
// can't rely on any of that.

const QUICK: [string, string][] = [
  ["Shop all spices", "/products"],
  ["Gift sets", "/gifts"],
  ["The Journal", "/journal"],
  ["Contact us", "/contact"],
];

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { market } = useMarket();
  const btn = market === "local" ? "btn btn-local" : "btn btn-intl";

  React.useEffect(() => {
    // Server-side visibility until Phase 8.3 (error tracking) lands — this is
    // the only place a rendering failure surfaces today.
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <SiteChrome>
      <main
        data-screen-label="error"
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          padding: "150px 24px 90px",
          position: "relative",
          overflow: "hidden",
          minHeight: "70vh",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(60% 50% at 50% 32%, rgba(15,110,86,.06), transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", maxWidth: 620, textAlign: "center" }}>
          <Reveal>
            <Liyawel width={210} style={{ marginBottom: 28 }} />
          </Reveal>
          <Reveal delay={60}>
            <div
              className="eyebrow"
              style={{ color: "var(--accent)", justifyContent: "center", display: "flex", gap: 11, alignItems: "center", marginBottom: 10 }}
            >
              <span style={{ width: 22, height: 1, background: "var(--accent)" }} />
              Something went wrong
              <span style={{ width: 22, height: 1, background: "var(--accent)" }} />
            </div>
          </Reveal>
          <Reveal delay={140}>
            <h1
              className="disp"
              style={{ fontSize: "clamp(30px,4vw,46px)", color: "var(--ink)", margin: "10px 0 0", lineHeight: 1.06, fontWeight: 600 }}
            >
              This path lost its footing.
            </h1>
          </Reveal>
          <Reveal delay={180}>
            <p className="prose" style={{ fontSize: "clamp(16px,1.5vw,18px)", color: "var(--muted)", margin: "16px auto 0", maxWidth: 460 }}>
              Something on our end didn&rsquo;t load right. It&rsquo;s usually temporary —
              try again, or head back and pick up where you left off.
            </p>
          </Reveal>

          <Reveal delay={220}>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 30, flexWrap: "wrap" }}>
              <button type="button" className={btn} style={{ width: "auto", padding: "12px 26px" }} onClick={() => reset()}>
                Try again
              </button>
              <Link
                href="/"
                className="btn"
                style={{
                  width: "auto",
                  padding: "12px 26px",
                  background: "#fff",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                }}
              >
                Back to home
              </Link>
            </div>
          </Reveal>

          <Reveal delay={260}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center", marginTop: 26 }}>
              {QUICK.map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "var(--brand)",
                    padding: "9px 16px",
                    borderRadius: 999,
                    border: "1px solid var(--line)",
                    background: "#fff",
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </Reveal>

          {error.digest && (
            <Reveal delay={300}>
              <p style={{ marginTop: 30, fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-ui)" }}>
                Reference: {error.digest}
              </p>
            </Reveal>
          )}
        </div>
      </main>
    </SiteChrome>
  );
}
