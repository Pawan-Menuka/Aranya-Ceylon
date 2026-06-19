import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { GIFTS } from "@/lib/gifts-data";
import { fetchGifts } from "@/lib/api/gifts";
import { SiteChrome } from "@/components/SiteChrome";
import { GiftsClient } from "@/components/marketing/GiftsClient";

export const metadata: Metadata = {
  title: "Gift Sets",
  description:
    "Curated boxes of single-origin Ceylon spice — hand-wrapped, ribboned and ready to give. Complimentary gift wrap, a handwritten note card, shipped worldwide.",
  alternates: { canonical: "/gifts" },
};

export const revalidate = 3600;

export default async function GiftsPage() {
  const market = resolveMarket();
  const gifts = (await fetchGifts()) ?? GIFTS;
  return (
    <SiteChrome initialMarket={market} hero>
      <GiftsClient gifts={gifts} />
    </SiteChrome>
  );
}
