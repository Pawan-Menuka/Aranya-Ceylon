"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/CartContext";
import { pollOrderPaid } from "@/lib/api/checkout";

type Status = "polling" | "confirmed" | "still-processing";

export function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") ?? "";
  const cart = useCart();
  const [status, setStatus] = React.useState<Status>("polling");
  const cleared = React.useRef(false);

  React.useEffect(() => {
    if (!orderId) {
      setStatus("still-processing");
      return;
    }
    pollOrderPaid(orderId).then((paid) => {
      if (paid && !cleared.current) {
        cleared.current = true;
        cart.clear();
        setStatus("confirmed");
      } else if (!paid) {
        setStatus("still-processing");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (status === "polling") {
    return (
      <div className="aranya" style={{ minHeight: "100vh", background: "var(--bg)", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "3px solid var(--brand)", borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--muted)" }}>Confirming your payment…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (status === "confirmed") {
    return (
      <div className="aranya" style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "70px 40px 100px", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: 999, background: "rgba(15,110,86,.1)", display: "grid", placeItems: "center", margin: "0 auto 24px" }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div className="eyebrow" style={{ color: "var(--accent)", justifyContent: "center", display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
            <span style={{ width: 24, height: 1, background: "var(--accent)" }} />
            Order confirmed
            <span style={{ width: 24, height: 1, background: "var(--accent)" }} />
          </div>
          <h1 className="disp" style={{ fontSize: 46, color: "var(--brand)", margin: "0 0 14px", lineHeight: 1.05 }}>
            Thank you — your spices are on their way
          </h1>
          <p className="prose" style={{ fontSize: 17, color: "var(--ink)", margin: "0 0 8px" }}>
            We&rsquo;ve emailed a confirmation. Each order is sealed within 24&nbsp;hours, fresh from the hill country.
          </p>
          {orderId && (
            <div style={{ display: "inline-flex", gap: 28, margin: "26px 0 32px", padding: "18px 30px", background: "var(--surface)", borderRadius: 12 }}>
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>Order no.</div>
                <div className="disp" style={{ fontSize: 22, color: "var(--ink)", fontWeight: 600 }}>{orderId}</div>
              </div>
            </div>
          )}
          <div>
            <Link href="/products" className="btn btn-intl" style={{ display: "inline-flex", width: "auto", padding: "14px 34px", textDecoration: "none" }}>
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // still-processing — webhook hasn't fired within the polling window
  return (
    <div className="aranya" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "70px 40px 100px", textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: 999, background: "rgba(180,135,60,.1)", display: "grid", placeItems: "center", margin: "0 auto 24px" }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
        </div>
        <div className="eyebrow" style={{ color: "var(--muted)", justifyContent: "center", display: "flex", marginBottom: 14 }}>
          Order status
        </div>
        <h1 className="disp" style={{ fontSize: 40, color: "var(--brand)", margin: "0 0 14px", lineHeight: 1.05 }}>
          We&rsquo;re confirming your order
        </h1>
        {/* This branch is also reached on a timeout, a failed payment, or a
            missing order — so it must NOT assert the payment succeeded (BUG-31). */}
        <p className="prose" style={{ fontSize: 17, color: "var(--ink)", margin: "0 0 24px" }}>
          We haven&rsquo;t received final confirmation for this order yet. If your payment
          went through, we&rsquo;ll email you as soon as it&rsquo;s confirmed — you don&rsquo;t need to
          do anything. If you were charged and don&rsquo;t hear from us shortly, contact support
          {orderId ? <> with order <strong>{orderId}</strong></> : null}.
        </p>
        <div>
          <Link href="/products" className="btn btn-intl" style={{ display: "inline-flex", width: "auto", padding: "14px 34px", textDecoration: "none" }}>
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
