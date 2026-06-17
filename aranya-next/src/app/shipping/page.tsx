import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { SiteChrome } from "@/components/SiteChrome";
import { ShippingClient } from "@/components/marketing/ShippingClient";

export const metadata: Metadata = {
  title: "Shipping & Returns",
  description:
    "Rates, delivery times and our fair returns policy — for orders within Sri Lanka and to 40+ countries worldwide.",
  alternates: { canonical: "/shipping" },
};

export default function ShippingPage() {
  const market = resolveMarket();
  return (
    <SiteChrome initialMarket={market} hero>
      <ShippingClient />
    </SiteChrome>
  );
}
