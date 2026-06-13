import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";
import { getProducts } from "@/lib/api/products";
import { getJournalPosts } from "@/lib/api/journal";
import { getRecipeSlugs } from "@/lib/recipes";

// Sitemap for crawlers. Each dynamic source already falls back to demo data on
// API failure, so the map degrades gracefully rather than throwing.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/$/, "");
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/journal`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/recipes`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const [products, journal, recipeSlugs] = await Promise.all([
    getProducts({ limit: 200 }).then((r) => r.items).catch(() => []),
    getJournalPosts().then((r) => r.posts).catch(() => []),
    getRecipeSlugs().catch(() => []),
  ]);

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/products/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const journalRoutes: MetadataRoute.Sitemap = journal.map((p) => ({
    url: `${base}/journal/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const recipeRoutes: MetadataRoute.Sitemap = recipeSlugs.map((slug) => ({
    url: `${base}/recipes/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...journalRoutes, ...recipeRoutes];
}
