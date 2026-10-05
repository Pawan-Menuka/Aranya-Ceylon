import type { Metadata } from "next";
import { SiteChrome } from "@/components/SiteChrome";
import { LegalClient } from "@/components/legal/LegalCommon";
import { COOKIES_SECTIONS } from "@/components/legal/legal-content";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "The cookies and similar technologies we use on aranyaceylon.com, why we use them, and how you can control them.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <SiteChrome hero>
      <LegalClient active="Cookies" title={<>Cookie<br />Policy.</>} updated="June 2026"
        lead="The cookies and similar technologies we use on our store, why we use them, and how you can control them."
        sections={COOKIES_SECTIONS} />
    </SiteChrome>
  );
}
