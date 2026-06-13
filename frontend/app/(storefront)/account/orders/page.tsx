"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/components/SessionProvider";

// Placeholder — the real order history (backed by a new GET /orders endpoint)
// lands in Phase 3b.
export default function OrdersPage() {
  const router = useRouter();
  const { user, loading } = useSession();

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
      <nav style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
        <Link href="/account" style={{ color: "var(--muted)" }}>Account</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span>Orders</span>
      </nav>
      <h1 className="disp" style={{ fontSize: "clamp(30px,4vw,42px)", margin: "0 0 16px" }}>Your orders</h1>
      <p className="prose" style={{ color: "var(--muted)" }}>
        Order history is coming shortly.
      </p>
    </main>
  );
}
