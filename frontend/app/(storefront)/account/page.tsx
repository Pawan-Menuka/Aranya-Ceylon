"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/components/SessionProvider";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, logout } = useSession();

  // Not signed in → send to login.
  useEffect(() => {
    if (!loading && !user) router.replace("/account/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px" }}>
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
      <p className="eyebrow" style={{ color: "var(--accent)" }}>Your account</p>
      <h1 className="disp" style={{ fontSize: "clamp(32px,4.5vw,46px)", margin: "6px 0 28px" }}>
        Hello, {user.name.split(" ")[0]}
      </h1>

      <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: 24, marginBottom: 24 }}>
        <Row label="Name" value={user.name} />
        <Row label="Email" value={user.email} />
        {user.verified === false && (
          <p style={{ fontSize: 13, color: "var(--accent)", marginTop: 12 }}>
            Your email isn’t verified yet.
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/account/orders" className="btn btn-intl" style={{ display: "inline-block" }}>
          View orders
        </Link>
        <button onClick={() => void logout()} className="btn btn-ghost">Sign out</button>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 13, color: "var(--muted)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 14, color: "var(--ink)" }}>{value}</span>
    </div>
  );
}
