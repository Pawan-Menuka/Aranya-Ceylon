"use client";

import * as React from "react";
import { Reveal } from "../primitives/Reveal";
import { Eyebrow, Liyawel } from "../primitives/Motif";

// ---------- Heritage — name etymology & Kandyan craft (near-black) ----------
export function Heritage() {
  return (
    <section style={{ background: "#1A1A1A", color: "#FDFAF5", padding: "120px 0", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 50% 0%, rgba(15,110,86,.18), transparent 60%)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 40px", position: "relative", textAlign: "center" }}>
        <Reveal><Liyawel width={300} style={{ marginBottom: 40 }} /></Reveal>
        <Reveal delay={60}><Eyebrow center light>The Name</Eyebrow></Reveal>
        <Reveal delay={100}>
          <h2 className="disp" style={{ fontSize: "clamp(40px,5vw,68px)", margin: "20px 0 0", lineHeight: 1.04, fontWeight: 600, letterSpacing: ".01em" }}>
            <span style={{ fontStyle: "italic" }}>Aranya</span> means <span style={{ color: "#E6B860" }}>the forest.</span>
          </h2>
        </Reveal>
        <Reveal delay={150}>
          <p className="prose" style={{ fontSize: 18.5, lineHeight: 1.78, color: "rgba(253,250,245,.82)", maxWidth: 640, margin: "30px auto 0" }}>
            From the Sanskrit <em style={{ color: "rgba(253,250,245,.95)" }}>araṇya</em> — the wild woodland. For three thousand years the hill forests of Ceylon have given the world its finest cinnamon, carried along the spice routes from the Kandyan kingdom to the courts of Rome and Cairo. We carry that lineage forward: the same forests, the same hands, the same unhurried craft.
          </p>
        </Reveal>
        <Reveal delay={200}>
          <div style={{ display: "flex", justifyContent: "center", gap: 0, margin: "52px auto 0", flexWrap: "wrap", maxWidth: 760 }}>
            {[["3,000+", "Years of Ceylon spice trade"], ["100%", "Single-origin, island-grown"], ["1,200m", "Hill-country elevation"]].map((s, i) => (
              <div key={s[0]} style={{ flex: "1 1 200px", padding: "0 28px", borderLeft: i === 0 ? "none" : "1px solid rgba(253,250,245,.16)" }}>
                <div className="disp" style={{ fontSize: 44, color: "#E6B860", fontWeight: 600, lineHeight: 1 }}>{s[0]}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "rgba(253,250,245,.7)", marginTop: 8, letterSpacing: ".02em" }}>{s[1]}</div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={240}><Liyawel width={300} style={{ marginTop: 52 }} /></Reveal>
      </div>
    </section>
  );
}

// ---------- Newsletter — restrained, no popup ----------
export function Newsletter() {
  const [email, setEmail] = React.useState("");
  const [done, setDone] = React.useState(false);
  return (
    <section style={{ background: "var(--surface)", padding: "92px 0", borderTop: "1px solid var(--line)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 40px", textAlign: "center" }}>
        <Reveal><Eyebrow center>The Harvest List</Eyebrow></Reveal>
        <Reveal delay={60}>
          <h2 className="disp" style={{ fontSize: 42, color: "var(--brand)", margin: "16px 0 12px", lineHeight: 1.05 }}>First pick of every harvest</h2>
        </Reveal>
        <Reveal delay={100}>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 15.5, color: "var(--muted)", margin: "0 auto 30px", maxWidth: 460, lineHeight: 1.6 }}>
            Occasional notes on new lots, the stories behind them, and recipes worth your time. No noise — just the good stuff.
          </p>
        </Reveal>
        <Reveal delay={140}>
          {done ? (
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 16, color: "var(--brand)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 24, height: 24, borderRadius: 999, background: "var(--brand)", display: "grid", placeItems: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
              </span>
              Welcome to the list — check your inbox.
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (email.includes("@")) setDone(true); }} style={{ display: "flex", gap: 10, maxWidth: 480, margin: "0 auto" }}>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={{ flex: 1, background: "#fff", border: "1px solid var(--line)", borderRadius: 6, padding: "14px 18px", fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--ink)", outline: "none" }} />
              <button type="submit" className="btn btn-intl" style={{ width: "auto", padding: "14px 26px", whiteSpace: "nowrap" }}>Join the list</button>
            </form>
          )}
        </Reveal>
        <Reveal delay={180}>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", marginTop: 18, opacity: 0.8 }}>No spam, ever. Unsubscribe in one click.</p>
        </Reveal>
      </div>
    </section>
  );
}
