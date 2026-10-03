import type { Metadata } from "next";
import { SiteChrome } from "@/components/SiteChrome";
import { LegalClient } from "@/components/legal/LegalCommon";
import { PRIVACY_SECTIONS } from "@/components/legal/legal-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What we collect when you shop our spices, why we collect it, and the choices you have over your information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <SiteChrome hero>
      <LegalClient active="Privacy" title={<>Privacy<br />Policy.</>} updated="June 2026"
        lead="What we collect when you shop our spices, why we collect it, and the choices you have over your information."
        sections={PRIVACY_SECTIONS} />
    </SiteChrome>
  );
}
