import type { MetadataRoute } from "next";

// Roadmap: SEO infrastructure. Next.js serves this at /robots.txt automatically.
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /admin already carries its own noindex meta tag; disallowing it here
      // too keeps crawlers from even requesting it. /account is signed-in-only
      // personal data. /api/* is the BFF proxy, not a page. /checkout has
      // nothing worth indexing and shouldn't be a landing page from search.
      disallow: ["/admin", "/account", "/api/", "/checkout"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
