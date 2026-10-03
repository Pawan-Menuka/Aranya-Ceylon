import type { Metadata } from "next";
import { SiteChrome } from "@/components/SiteChrome";
import { FaqClient } from "@/components/marketing/FaqClient";

export const metadata: Metadata = {
  title: "Help & FAQ",
  description:
    "Everything about orders, shipping, our spices, payments and returns — grouped so you can find it fast.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <SiteChrome hero>
      <FaqClient />
    </SiteChrome>
  );
}
