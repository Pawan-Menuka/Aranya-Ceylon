import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { SiteChrome } from "@/components/SiteChrome";
import { GiftsClient } from "@/components/marketing/GiftsClient";

export const metadata: Metadata = {
  title: "Gift Sets",
  description:
    "Curated boxes of single-origin Ceylon spice — hand-wrapped, ribboned and ready to give. Complimentary gift wrap, a handwritten note card, shipped worldwide.",
  alternates: { canonical: "/gifts" },
};

export default function GiftsPage() {
  const market = resolveMarket();
  return (
    <SiteChrome initialMarket={market} hero>
      <GiftsClient />
    </SiteChrome>
  );
}
