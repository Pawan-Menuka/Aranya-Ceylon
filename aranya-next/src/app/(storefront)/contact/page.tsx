import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { SiteChrome } from "@/components/SiteChrome";
import { ContactClient } from "@/components/marketing/ContactClient";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Order question, product curiosity, or a wholesale enquiry — reach the right desk and a real person in Kandy will get back to you. WhatsApp, email or call.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const market = resolveMarket();
  return (
    <SiteChrome initialMarket={market} hero>
      <ContactClient />
    </SiteChrome>
  );
}
