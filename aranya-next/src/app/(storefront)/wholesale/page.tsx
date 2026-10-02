import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { SiteChrome } from "@/components/SiteChrome";
import { WholesaleClient } from "@/components/marketing/WholesaleClient";

export const metadata: Metadata = {
  title: "Wholesale & Trade",
  description:
    "Single-origin Ceylon spice by the kilo — supplied to kitchens, roasters and shelves. Low MOQs, GI-certified lots, private label, and tracked global logistics.",
  alternates: { canonical: "/wholesale" },
};

export default function WholesalePage() {
  const market = resolveMarket();
  return (
    <SiteChrome initialMarket={market} hero>
      <WholesaleClient />
    </SiteChrome>
  );
}
