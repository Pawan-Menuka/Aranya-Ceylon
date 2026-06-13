import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans, Spectral } from "next/font/google";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

// Three locked typography roles (see frontend/DESIGN.md):
//   display → Cormorant Garamond, UI → Plus Jakarta Sans, reading → Spectral
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});
const ui = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});
const read = Spectral({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-read",
  display: "swap",
});

const TITLE = "Aranya Ceylon — Spice, as the forest intended.";
const DESCRIPTION =
  "Premium single-origin Ceylon spices from the hill-country farms of Sri Lanka.";

// metadataBase makes per-page OG/canonical URLs resolve to absolute links;
// the OpenGraph/Twitter defaults below are inherited (and overridden) per page.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Pages set their own full title (suffixed "— Aranya Ceylon"), matching the
  // existing product-page convention; this is the fallback for pages that don't.
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Aranya Ceylon",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} ${read.variable}`}>
      <body>{children}</body>
    </html>
  );
}
