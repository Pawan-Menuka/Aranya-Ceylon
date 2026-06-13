"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { authCardStyle, authInput, authLabel } from "@/components/authStyles";

export default function RegisterPage() {
  const { register } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await register(name, email, password);
    if (res.ok) {
      setDone(true); // backend doesn't auto-login (#9) — prompt to sign in
    } else {
      setError(res.error ?? "Sign-up failed");
      setBusy(false);
    }
  };

  if (done) {
    return (
      <main style={{ maxWidth: 440, margin: "0 auto", padding: "64px 24px", textAlign: "center" }}>
        <h1 className="disp" style={{ fontSize: 32, margin: "0 0 12px" }}>Check your inbox</h1>
        <p className="prose" style={{ color: "var(--muted)", marginBottom: 28 }}>
          If this email is new, a verification link is on its way. You can sign in once verified.
        </p>
        <Link href="/account/login" className="btn btn-intl" style={{ display: "inline-block" }}>
          Go to sign in
        </Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 440, margin: "0 auto", padding: "64px 24px" }}>
      <h1 className="disp" style={{ fontSize: 36, textAlign: "center", margin: "0 0 28px" }}>Create account</h1>
      <form onSubmit={submit} style={authCardStyle}>
        <div>
          <label style={authLabel}>Full name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} style={authInput} />
        </div>
        <div>
          <label style={authLabel}>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={authInput} />
        </div>
        <div>
          <label style={authLabel}>Password</label>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} style={authInput} />
          <span style={{ fontSize: 12, color: "var(--muted)" }}>At least 8 characters.</span>
        </div>
        {error && <p style={{ color: "#B23B3B", fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-intl" style={{ width: "100%", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p style={{ textAlign: "center", fontSize: 14, color: "var(--muted)", marginTop: 20 }}>
        Already have an account? <Link href="/account/login" style={{ color: "var(--brand)", fontWeight: 600 }}>Sign in</Link>
      </p>
    </main>
  );
}
