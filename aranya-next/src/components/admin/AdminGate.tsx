"use client";

import * as React from "react";
import Link from "next/link";
import { Seal } from "../primitives/Seal";
import { AIcon } from "./AdminPrimitives";
import { DEMO_MODE } from "@/lib/demo";

// Aranya Ceylon — ADMIN sign-in gate. The console is role-gated to ADMIN /
// SUPERADMIN (spec §6). A real admin session (auth/me role) enters straight
// through; offline / demo, this branded screen grants a local demo session so
// the console stays reviewable without a backend (acceptance criterion §11).

export function AdminGate({ onEnter, error }: { onEnter: (email: string, password: string) => void; error?: string | null }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await Promise.resolve(onEnter(email, password));
    setBusy(false);
  };

  return (
    <div className="admin" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1.1fr 1fr" }}>
      {/* left — branded forest panel */}
      <div style={{ background: "linear-gradient(155deg,#0F6E56 0%, #0B5A48 55%, #0A4A3C 100%)", color: "#FDFAF5", padding: "56px 60px", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 60% at 80% 10%, rgba(230,184,96,.16), transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
          <Seal size={42} tone="light" />
          <div style={{ lineHeight: 1 }}>
            <div className="disp" style={{ fontSize: 25, letterSpacing: ".01em" }}>Aranya Ceylon</div>
            <div style={{ fontSize: 9, letterSpacing: ".26em", color: "#E6B860", fontWeight: 700, textTransform: "uppercase", marginTop: 4 }}>Admin Console</div>
          </div>
        </div>
        <div style={{ position: "relative", marginTop: "auto" }}>
          <h1 className="disp" style={{ fontSize: 46, fontWeight: 600, lineHeight: 1.04, letterSpacing: ".01em" }}>Tend the harvest,<br />from root to checkout.</h1>
          <p style={{ fontSize: 15, color: "rgba(253,250,245,.78)", marginTop: 16, maxWidth: 420, lineHeight: 1.6 }}>
            Orders, inventory, the journal and the audit trail — the whole back office for the hill-country spice house, in one quiet room.
          </p>
          {/* Illustrative figures only — shown in demo mode, hidden in production
              so the sign-in screen never presents fabricated live stats (BUG-20). */}
          {DEMO_MODE && (
            <div style={{ display: "flex", gap: 26, marginTop: 30, borderTop: "1px solid rgba(253,250,245,.16)", paddingTop: 22 }}>
              {[["Orders today", "31"], ["Awaiting ship", "18"], ["Low stock", "4"]].map((s) => (
                <div key={s[0]}>
                  <div className="disp" style={{ fontSize: 28, fontWeight: 600 }}>{s[1]}</div>
                  <div style={{ fontSize: 11, color: "rgba(253,250,245,.6)", fontWeight: 600, letterSpacing: ".04em", marginTop: 2 }}>{s[0]}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* right — sign-in */}
      <div style={{ display: "grid", placeItems: "center", padding: 40 }}>
        <form onSubmit={submit} style={{ width: "100%", maxWidth: 360 }}>
          <div className="ad-eyebrow">Restricted area</div>
          <h2 className="disp" style={{ fontSize: 32, fontWeight: 600, color: "var(--ad-ink)", marginTop: 6 }}>Sign in to the console</h2>
          <p style={{ fontSize: 13.5, color: "var(--ad-muted)", marginTop: 6 }}>Staff access only. Every action is recorded in the audit log.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 26 }}>
            <div className="ad-field">
              <label className="ad-label">Work email</label>
              <input className="ad-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@aranyaceylon.com" autoComplete="username" />
            </div>
            <div className="ad-field">
              <label className="ad-label">Password</label>
              <input className="ad-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
            </div>
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--neg)", background: "rgba(192,73,47,.08)", border: "1px solid rgba(192,73,47,.25)", borderRadius: 9, padding: "9px 12px" }}>
                <AIcon name="alert" size={15} stroke="var(--neg)" />{error}
              </div>
            )}
            <button type="submit" className="ad-btn ad-btn-green" disabled={busy} style={{ justifyContent: "center", marginTop: 4, opacity: busy ? 0.7 : 1 }}>
              {busy ? "Signing in…" : "Enter console"}
            </button>
          </div>

          {DEMO_MODE && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, fontSize: 12, color: "var(--ad-faint)", background: "var(--ad-soft)", borderRadius: 9, padding: "10px 12px" }}>
              <AIcon name="sparkle" size={15} stroke="var(--warn)" />
              <span><b style={{ color: "var(--ad-muted)" }}>Demo:</b> no backend required — any password enters the offline console.</span>
            </div>
          )}

          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 22, fontSize: 13, fontWeight: 600, color: "var(--ad-muted)", textDecoration: "none" }}>
            <AIcon name="chevronL" size={15} stroke="var(--ad-muted)" />Back to store
          </Link>
        </form>
      </div>
    </div>
  );
}
