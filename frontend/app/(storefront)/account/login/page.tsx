"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { authCardStyle, authInput, authLabel } from "@/components/authStyles";

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in → bounce to account.
  useEffect(() => { if (user) router.replace("/account"); }, [user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await login(email, password);
    if (res.ok) {
      router.push("/account");
    } else {
      setError(res.error ?? "Sign-in failed");
      setBusy(false);
    }
  };

  return (
    <main style={{ maxWidth: 440, margin: "0 auto", padding: "64px 24px" }}>
      <h1 className="disp" style={{ fontSize: 36, textAlign: "center", margin: "0 0 28px" }}>Sign in</h1>
      <form onSubmit={submit} style={authCardStyle}>
        <div>
          <label style={authLabel}>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={authInput} />
        </div>
        <div>
          <label style={authLabel}>Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={authInput} />
        </div>
        {error && <p style={{ color: "#B23B3B", fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-intl" style={{ width: "100%", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p style={{ textAlign: "center", fontSize: 14, color: "var(--muted)", marginTop: 20 }}>
        New here? <Link href="/account/register" style={{ color: "var(--brand)", fontWeight: 600 }}>Create an account</Link>
      </p>
    </main>
  );
}
