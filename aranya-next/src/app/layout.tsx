import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans, Spectral } from "next/font/google";
import "./globals.css";
import { resolveMarket } from "@/lib/market";
import { CommerceProvider } from "@/components/CommerceProvider";

// Three locked brand roles (spec §3). next/font self-hosts the files and
// exposes each as a CSS variable consumed by globals.css.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});
const spectral = Spectral({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
  display: "swap",
});

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const market = resolveMarket();
  return (
    <html lang="en" className={`${cormorant.variable} ${jakarta.variable} ${spectral.variable}`}>
      <body className="aranya">
        <CommerceProvider initialMarket={market}>
          {children}
        </CommerceProvider>
      </body>
    </html>
  );
}
