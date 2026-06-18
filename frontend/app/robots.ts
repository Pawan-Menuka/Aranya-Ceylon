import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

// Allow crawling of public content; keep per-user/checkout areas out of the
// index. Points crawlers at the sitemap.
export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/checkout", "/cart", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
