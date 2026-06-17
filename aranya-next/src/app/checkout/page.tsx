import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { CommerceProvider } from "@/components/CommerceProvider";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Secure checkout — Aranya Ceylon.",
  robots: { index: false },
};

// Checkout has its own minimal branded header (not the storefront navbar), so it
// wraps in CommerceProvider directly rather than SiteChrome. Guest checkout is
// the default; the cart lives in context.
export default function CheckoutPage() {
  const market = resolveMarket();
  return (
    <CommerceProvider initialMarket={market}>
      <CheckoutClient />
    </CommerceProvider>
  );
}
