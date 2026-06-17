"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Reveal } from "../primitives/Reveal";
import { Liyawel } from "../primitives/Motif";
import { Icon } from "../primitives/Icon";
import { useMarket } from "../MarketContext";

// 404 (ported from 404.html). Big numeral, search box, quick links.

const QUICK: [string, string][] = [
  ["Shop all spices", "/products"],
  ["Browse categories", "/categories"],
  ["Gift sets", "/gifts"],
  ["Recipes", "/recipes"],
  ["The Journal", "/journal"],
];

export function NotFoundClient() {
  const { market } = useMarket();
  const router = useRouter();
  const btn = market === "local" ? "btn btn-local" : "btn btn-intl";

  const onSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim();
    router.push("/search" + (q ? "?q=" + encodeURIComponent(q) : ""));
  };

  return (
    <main data-screen-label="404" style={{ flex: 1, display: "grid", placeItems: "center", padding: "150px 24px 90px", position: "relative", overflow: "hidden", minHeight: "70vh" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 50% at 50% 32%, rgba(15,110,86,.06), transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", maxWidth: 620, textAlign: "center" }}>
        <Reveal><Liyawel width={210} style={{ marginBottom: 28 }} /></Reveal>
        <Reveal delay={60}>
          <div className="eyebrow" style={{ color: "var(--accent)", justifyContent: "center", display: "flex", gap: 11, alignItems: "center", marginBottom: 10 }}>
            <span style={{ width: 22, height: 1, background: "var(--accent)" }} />Error 404<span style={{ width: 22, height: 1, background: "var(--accent)" }} />
          </div>
        </Reveal>
        <Reveal delay={90}>
          <div className="disp" style={{ fontWeight: 600, color: "var(--brand)", fontSize: "clamp(120px, 22vw, 280px)", lineHeight: 0.85, letterSpacing: ".01em" }}>404</div>
        </Reveal>
        <Reveal delay={140}>
          <h1 className="disp" style={{ fontSize: "clamp(30px,4vw,46px)", color: "var(--ink)", margin: "10px 0 0", lineHeight: 1.06, fontWeight: 600 }}>
            This trail has gone cold.
          </h1>
        </Reveal>
        <Reveal delay={180}>
          <p className="prose" style={{ fontSize: "clamp(16px,1.5vw,18px)", color: "var(--muted)", margin: "16px auto 0", maxWidth: 460 }}>
            The page you&rsquo;re after has moved, sold out, or never existed. Let&rsquo;s get you back to the good stuff — try a search or one of these.
          </p>
        </Reveal>

        <Reveal delay={220}>
          <form onSubmit={onSearch} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid var(--line)", borderRadius: 999, padding: "8px 8px 8px 18px", maxWidth: 440, margin: "30px auto 0", boxShadow: "var(--shadow-sm)" }}>
            <Icon name="search" size={19} stroke="var(--muted)" />
            <input name="q" placeholder="Search spices, recipes, origins…" style={{ flex: 1, background: "transparent", border: 0, outline: 0, color: "var(--ink)", fontFamily: "var(--font-ui)", fontSize: 14.5, minWidth: 0 }} />
            <button type="submit" className={btn} style={{ width: "auto", padding: "11px 20px", flex: "0 0 auto" }}>Search</button>
          </form>
        </Reveal>

        <Reveal delay={260}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center", marginTop: 26 }}>
            {QUICK.map(([label, href]) => (
              <Link key={label} href={href} style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 600, color: "var(--brand)", padding: "9px 16px", borderRadius: 999, border: "1px solid var(--line)", background: "#fff", transition: "background .15s, border-color .15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.borderColor = "var(--gold-line)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "var(--line)"; }}>
                {label}
              </Link>
            ))}
          </div>
        </Reveal>

        <Reveal delay={300}>
          <div style={{ marginTop: 34 }}>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
              Back to home
            </Link>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
