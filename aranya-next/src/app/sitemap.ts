import type { MetadataRoute } from "next";
import { listProducts } from "@/lib/api/products";
import { listBlog } from "@/lib/api/blog";
import { fetchRecipes } from "@/lib/api/recipes";
import { CATALOG } from "@/lib/catalog-data";
import { JOURNAL } from "@/lib/journal-data";
import { RECIPES } from "@/lib/recipes-data";

// Roadmap: SEO infrastructure. Next.js serves whatever this default export
// returns at /sitemap.xml automatically — no route handler needed. Revalidate
// hourly so new products/posts/recipes show up without a full rebuild.
export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Real, content-bearing routes only — /cart and /categories/[slug] are
// server redirects (nothing to index there), /search and /checkout are
// query-dependent or transactional, and /account and /admin are gated
// (already excluded from crawling entirely via robots.ts).
const STATIC_ROUTES = [
  "", "/products", "/categories", "/journal", "/recipes", "/about", "/gifts",
  "/wholesale", "/contact", "/faq", "/shipping", "/privacy", "/terms", "/cookies",
];

async function productEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const slugs: { slug: string; updatedAt: string }[] = [];
    let cursor: string | undefined;
    // Paginate the live catalog rather than assuming it fits in one page —
    // capped generously so a very large catalog can't loop forever.
    for (let page = 0; page < 20; page++) {
      const res = await listProducts({ limit: 100, cursor }, 3600);
      slugs.push(...res.items.map((p) => ({ slug: p.slug, updatedAt: p.createdAt })));
      if (!res.nextCursor) break;
      cursor = res.nextCursor;
    }
    if (slugs.length) {
      return slugs.map((p) => ({ url: `${SITE}/products/${p.slug}`, lastModified: new Date(p.updatedAt) }));
    }
  } catch {
    /* fall through to the demo catalog below */
  }
  return CATALOG.map((s) => ({ url: `${SITE}/products/${s.slug}` }));
}

async function journalEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    // The backend clamps `limit` to 50, so one more page covers up to 100 —
    // plenty for a starting sitemap; extend with a loop if the journal
    // ever grows past that.
    const first = await listBlog({ limit: 50 }, 3600);
    const items = [...first.items];
    if (first.nextCursor) {
      const second = await listBlog({ limit: 50, cursor: first.nextCursor }, 3600);
      items.push(...second.items);
    }
    if (items.length) {
      return items.map((b) => ({
        url: `${SITE}/journal/${b.slug}`,
        ...(b.publishedAt && { lastModified: new Date(b.publishedAt) }),
      }));
    }
  } catch {
    /* fall through to the demo journal below */
  }
  return JOURNAL.map((p) => ({ url: `${SITE}/journal/${p.slug}` }));
}

async function recipeEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const recipes = await fetchRecipes();
    if (recipes?.length) {
      return recipes.map((r) => ({ url: `${SITE}/recipes/${r.slug}` }));
    }
  } catch {
    /* fall through to the demo set below */
  }
  return RECIPES.map((r) => ({ url: `${SITE}/recipes/${r.slug}` }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, journal, recipes] = await Promise.all([
    productEntries(),
    journalEntries(),
    recipeEntries(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE}${path}`,
  }));

  return [...staticEntries, ...products, ...journal, ...recipes];
}
