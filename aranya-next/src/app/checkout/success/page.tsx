import { Suspense } from "react";
import type { Metadata } from "next";
import { SuccessContent } from "./SuccessContent";

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false },
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="aranya" style={{ minHeight: "100vh", background: "var(--bg)", display: "grid", placeItems: "center" }}>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--muted)" }}>Confirming your payment…</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
