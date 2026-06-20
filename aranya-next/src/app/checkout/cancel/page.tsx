import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Payment Cancelled",
  robots: { index: false },
};

export default function CheckoutCancelPage() {
  return (
    <div className="aranya" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 580, margin: "0 auto", padding: "80px 40px 100px", textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: 999, background: "rgba(0,0,0,.05)", display: "grid", placeItems: "center", margin: "0 auto 24px" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </div>
        <div className="eyebrow" style={{ color: "var(--muted)", justifyContent: "center", display: "flex", marginBottom: 14 }}>
          Payment cancelled
        </div>
        <h1 className="disp" style={{ fontSize: 40, color: "var(--brand)", margin: "0 0 14px", lineHeight: 1.05 }}>
          No charge was made
        </h1>
        <p className="prose" style={{ fontSize: 17, color: "var(--ink)", margin: "0 0 28px" }}>
          Your payment was cancelled and your cart is still intact.
          Head back to checkout whenever you&rsquo;re ready.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/checkout" className="btn btn-intl" style={{ display: "inline-flex", width: "auto", padding: "14px 34px", textDecoration: "none" }}>
            Return to checkout
          </Link>
          <Link href="/products" style={{ display: "inline-flex", alignItems: "center", padding: "14px 24px", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--muted)", textDecoration: "none" }}>
            Browse products
          </Link>
        </div>
      </div>
    </div>
  );
}
