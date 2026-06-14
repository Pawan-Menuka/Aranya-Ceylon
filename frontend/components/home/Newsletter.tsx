"use client";

import { useState } from "react";
import { Eyebrow } from "../design/Primitives";

// Newsletter — restrained, no popup (ported from home-footer.jsx). Local-only
// confirmation for now; wiring to a list provider is a later roadmap item.
export function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <section style={{ background: "var(--surface)", padding: "92px 0", borderTop: "1px solid var(--line)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 40px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}><Eyebrow center>The Harvest List</Eyebrow></div>
        <h2 className="disp" style={{ fontSize: 42, color: "var(--brand)", margin: "16px 0 12px", lineHeight: 1.05 }}>First pick of every harvest</h2>
        <p style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 15.5, color: "var(--muted)", margin: "0 auto 30px", maxWidth: 460, lineHeight: 1.6 }}>
          Occasional notes on new lots, the stories behind them, and recipes worth your time. No noise — just the good stuff.
        </p>
        {done ? (
          <div style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 16, color: "var(--brand)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 24, height: 24, borderRadius: 999, background: "var(--brand)", display: "grid", placeItems: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
            </span>
            Welcome to the list — check your inbox.
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); if (email.includes("@")) setDone(true); }}
            style={{ display: "flex", gap: 10, maxWidth: 480, margin: "0 auto" }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              style={{ flex: 1, background: "#fff", border: "1px solid var(--line)", borderRadius: 6, padding: "14px 18px", fontFamily: "var(--font-ui), sans-serif", fontSize: 15, color: "var(--ink)", outline: "none" }}
            />
            <button type="submit" className="btn btn-intl" style={{ width: "auto", padding: "14px 26px", whiteSpace: "nowrap" }}>Join the list</button>
          </form>
        )}
        <p style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 12, color: "var(--muted)", marginTop: 18, opacity: 0.8 }}>No spam, ever. Unsubscribe in one click.</p>
      </div>
    </section>
  );
}
