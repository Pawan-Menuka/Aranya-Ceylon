"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";

// Refreshes the cart on mount (it was cleared server-side on payment) so the
// navbar badge resets, then shows the confirmation.
export function SuccessClient({ orderId }: { orderId: string | null }) {
  const { refresh } = useCart();
  useEffect(() => { void refresh(); }, [refresh]);

  const shortId = orderId ? orderId.slice(-8).toUpperCase() : null;

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
      <div
        aria-hidden
        style={{
          width: 64, height: 64, borderRadius: 999, background: "var(--brand)",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px",
        }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="disp" style={{ fontSize: "clamp(30px,4vw,42px)", margin: "0 0 12px" }}>Thank you</h1>
      <p className="prose" style={{ fontSize: 18, color: "var(--ink)", margin: "0 0 8px" }}>
        Your order is confirmed.
      </p>
      {shortId && (
        <p style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 14, color: "var(--muted)" }}>
          Order reference <strong style={{ color: "var(--ink)" }}>#{shortId}</strong>
        </p>
      )}
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "20px 0 32px" }}>
        A confirmation email is on its way. (Test mode — no real payment was taken.)
      </p>
      <Link href="/products" className="btn btn-intl" style={{ display: "inline-block" }}>
        Continue shopping
      </Link>
    </main>
  );
}
