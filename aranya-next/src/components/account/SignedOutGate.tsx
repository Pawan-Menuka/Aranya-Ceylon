"use client";

import * as React from "react";
import { Seal } from "../primitives/Seal";
import { Liyawel, Eyebrow } from "../primitives/Motif";
import { useMarket } from "../MarketContext";
import { useAuth } from "../AuthContext";

// Signed-out gate (ported from account.jsx SignedOutGate), wired to real auth.
// Sign in / register call the AuthContext; on success the parent swaps to the
// dashboard. Offline, AuthContext falls back to a demo session so the dashboard
// is still reachable (flagged with a small notice).
export function SignedOutGate() {
  const { market } = useMarket();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = React.useState<"in" | "up">("in");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const accentBtn = market === "local" ? "btn btn-local" : "btn btn-intl";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "in") await signIn(email, password);
      else await signUp(name, email, password);
      // success: parent re-renders to the dashboard (user is now set)
    } catch (err) {
      setError((err as Error)?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, type: string, ph: string, value: string, onChange: (v: string) => void) => (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 6 }}>{label}</span>
      <input type={type} placeholder={ph} value={value} onChange={(e) => onChange(e.target.value)} required style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 14px", background: "#fff", outline: "none" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--brand)")} onBlur={(e) => (e.target.style.borderColor = "var(--line)")} />
    </label>
  );

  return (
    <div data-screen-label="Account — sign in" style={{ paddingTop: 96, background: "var(--bg)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "60px 40px 100px" }}>
        <div className="ac-gate" style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 56, alignItems: "center" }}>
          <div>
            <Eyebrow>Your account</Eyebrow>
            <h1 className="disp" style={{ fontSize: "clamp(38px,4.4vw,56px)", color: "var(--brand)", margin: "16px 0 30px", lineHeight: 1.16 }}>Track every harvest, from hill to home.</h1>
            <p className="prose" style={{ fontSize: 17, color: "var(--ink)", margin: "0 0 30px", maxWidth: 460 }}>
              Sign in to follow your shipments in real time, reorder your pantry in a tap, and keep your Harvest Club points growing.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 }}>
              {[["Live order tracking", "Watch each parcel move from our Kandy facility to your door."], ["One-tap reorder", "Restock favourites in seconds — same lot, same freshness."], ["Harvest Club rewards", "Earn points on every order toward free gift boxes."]].map((b) => (
                <div key={b[0]} style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
                  <span style={{ width: 34, height: 34, borderRadius: 999, background: "rgba(15,110,86,.1)", display: "grid", placeItems: "center", flex: "0 0 auto", marginTop: 1 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  </span>
                  <div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{b[0]}</div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", marginTop: 2, lineHeight: 1.5 }}>{b[1]}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 34 }}><Liyawel width={260} /></div>
          </div>
          <div style={{ background: "#FFFDF9", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow-md)", overflow: "hidden" }}>
            <div style={{ background: "var(--brand)", color: "#FDFAF5", padding: "26px 32px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 100% at 100% 0%, rgba(29,158,117,.5), transparent 55%)" }} />
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><Seal size={46} tone="light" /></div>
                <h2 className="disp" style={{ fontSize: 27, margin: 0, fontWeight: 600 }}>{mode === "in" ? "Welcome back" : "Create your account"}</h2>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "rgba(253,250,245,.78)", margin: "5px 0 0" }}>{mode === "in" ? "Sign in to track orders & reorder favourites" : "Save your details for a faster checkout"}</p>
              </div>
            </div>
            <form onSubmit={submit} style={{ padding: "26px 32px 30px" }}>
              {mode === "up" && field("Full name", "text", "Your name", name, setName)}
              {field("Email", "email", "you@example.com", email, setEmail)}
              {field("Password", "password", "••••••••", password, setPassword)}
              {mode === "in" && <div style={{ textAlign: "right", marginTop: -6, marginBottom: 12 }}><a href="#" style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "var(--brand)" }}>Forgot password?</a></div>}
              {error && <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "#C0531F", fontWeight: 600, marginBottom: 12 }}>{error}</div>}
              <button type="submit" className={accentBtn} disabled={busy} style={{ marginTop: 4, opacity: busy ? 0.7 : 1 }}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</button>
              <div style={{ textAlign: "center", marginTop: 16, fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)" }}>
                {mode === "in" ? "New to Aranya? " : "Already have an account? "}
                <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(null); }} style={{ background: "none", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--brand)", textDecoration: "underline", textUnderlineOffset: 3 }}>{mode === "in" ? "Create an account" : "Sign in"}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
