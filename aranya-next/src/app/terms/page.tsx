import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { SiteChrome } from "@/components/SiteChrome";
import { LegalClient } from "@/components/legal/LegalCommon";
import { TERMS_SECTIONS } from "@/components/legal/legal-content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of aranyaceylon.com and your purchase of spices and gift sets from Aranya Ceylon.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const market = resolveMarket();
  return (
    <SiteChrome initialMarket={market} hero>
      <LegalClient active="Terms" title={<>Terms of<br />Service.</>} updated="June 2026"
        lead="The terms that govern your use of our store and your purchase of spices and gift sets from Aranya Ceylon."
        sections={TERMS_SECTIONS} />
    </SiteChrome>
  );
}
