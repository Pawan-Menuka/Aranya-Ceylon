import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Secure checkout — Aranya Ceylon.",
  robots: { index: false },
};

// Checkout has its own minimal branded header (not the storefront navbar).
// CommerceProvider is mounted at the root layout — no wrapper needed here.
export default function CheckoutPage() {
  return <CheckoutClient />;
}
