"use client";

import * as React from "react";
import { Seal } from "../primitives/Seal";
import { useCart } from "../CartContext";
import { useAuth } from "../AuthContext";

// Sign-in / register modal (ported from cart-ui.jsx SignInModal). Open state is
// owned by the cart context (openSignIn/closeSignIn); the form is wired to the
// real AuthContext (login/register via the BFF, with offline demo fallback).
// "Continue as guest" simply closes — guest checkout is always available.
export function SignInModal() {
  const cart = useCart();
  const { signIn, signUp } = useAuth();
  const open = cart.signInOpen;
  const onClose = cart.closeSignIn;
  const [mode, setMode] = React.useState<"in" | "up">("in");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "in") await signIn(email, password);
      else await signUp(name, email, password);
      onClose(); // success — auth context now has the user
    } catch (err) {
      setError((err as Error)?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, type: string, ph: string, value: string, onChange: (v: string) => void) => (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 6 }}>{label}</span>
      <input type={type} placeholder={ph} value={value} onChange={(e) => onChange(e.target.value)} required style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 14px", background: "#fff", outline: "none" }} />
    </label>
  );

  return (
    <div className="aranya" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 130, background: "rgba(20,16,12,.5)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(420px, 100%)", background: "var(--bg)", borderRadius: 14, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
        <div style={{ background: "var(--brand)", padding: "26px 30px 24px", textAlign: "center", color: "#FDFAF5" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><Seal size={48} tone="light" /></div>
          <h2 className="disp" style={{ fontSize: 27, margin: 0 }}>{mode === "in" ? "Welcome back" : "Create your account"}</h2>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "rgba(253,250,245,.78)", margin: "5px 0 0" }}>{mode === "in" ? "Sign in to track orders & reorder favourites" : "Save your details for faster checkout"}</p>
        </div>
        <form onSubmit={submit} style={{ padding: "26px 30px 30px" }}>
          {mode === "up" && field("Full name", "text", "Your name", name, setName)}
          {field("Email", "email", "you@example.com", email, setEmail)}
          {field("Password", "password", "••••••••", password, setPassword)}
          {error && <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "#C0531F", fontWeight: 600, marginBottom: 12 }}>{error}</div>}
          <button type="submit" className="btn btn-intl" disabled={busy} style={{ marginTop: 4, opacity: busy ? 0.7 : 1 }}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</button>
          <div style={{ textAlign: "center", marginTop: 16, fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)" }}>
            {mode === "in" ? "New to Aranya? " : "Already have an account? "}
            <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(null); }} style={{ background: "none", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--brand)", textDecoration: "underline", textUnderlineOffset: 3 }}>{mode === "in" ? "Create an account" : "Sign in"}</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>or</span>
            <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>
          <button type="button" onClick={onClose} style={{ width: "100%", background: "transparent", border: "1.5px solid var(--brand)", color: "var(--brand)", borderRadius: 999, padding: "13px", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700 }}>Continue as guest</button>
        </form>
      </div>
    </div>
  );
}
