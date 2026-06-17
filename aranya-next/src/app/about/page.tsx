import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { SiteChrome } from "@/components/SiteChrome";
import { AboutClient } from "@/components/marketing/AboutClient";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "A small house of spice from the hill forests of Sri Lanka — peeled, dried and milled by hand, sourced from named estates, and shipped at the height of aroma.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const market = resolveMarket();
  return (
    <SiteChrome initialMarket={market} hero>
      <AboutClient />
    </SiteChrome>
  );
}
