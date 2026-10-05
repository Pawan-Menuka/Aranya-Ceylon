import type { Metadata } from "next";
import "./fonts.css";
import "./globals.css";
import { resolveMarket } from "@/lib/market";
import { CommerceProvider } from "@/components/CommerceProvider";
import PerformanceTelemetry from "@/components/performance/PerformanceTelemetry";

// Locked brand roles use the exact accepted font bytes and fallback metrics.
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Aranya Ceylon — Forest Sourced Ceylon Spices",
    template: "%s · Aranya Ceylon",
  },
  description:
    "Single-origin Ceylon spice, lifted from the hill forests of Sri Lanka and shipped at peak aroma. Spice, as the forest intended.",
  openGraph: {
    title: "Aranya Ceylon — Forest Sourced Ceylon Spices",
    description: "Single-origin Ceylon spice, shipped at peak aroma.",
    type: "website",
    url: SITE,
  },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const market = await resolveMarket();
  return (
    <html lang="en" className="__variable_6adbea __variable_a11773 __variable_cfa357">
      <body className="aranya">
        <PerformanceTelemetry />
        <noscript><style>{`[data-scroll-reveal] { opacity: 1 !important; transform: none !important; }`}</style></noscript>
        <CommerceProvider initialMarket={market}>
          {children}
        </CommerceProvider>
      </body>
    </html>
  );
}
