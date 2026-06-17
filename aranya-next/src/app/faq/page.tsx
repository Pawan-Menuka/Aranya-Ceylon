import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { SiteChrome } from "@/components/SiteChrome";
import { FaqClient } from "@/components/marketing/FaqClient";

export const metadata: Metadata = {
  title: "Help & FAQ",
  description:
    "Everything about orders, shipping, our spices, payments and returns — grouped so you can find it fast.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const market = resolveMarket();
  return (
    <SiteChrome initialMarket={market} hero>
      <FaqClient />
    </SiteChrome>
  );
}
