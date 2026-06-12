import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans, Spectral } from "next/font/google";
import "./globals.css";

// Three locked typography roles (see frontend-legacy/CLAUDE.md):
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

export const metadata: Metadata = {
  title: "Aranya Ceylon — Spice, as the forest intended.",
  description:
    "Premium single-origin Ceylon spices from the hill-country farms of Sri Lanka.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} ${read.variable}`}>
      <body>{children}</body>
    </html>
  );
}
