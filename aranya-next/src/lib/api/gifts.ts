import type { GiftSet } from "@/lib/gifts-data";

// Server-side only — called from Next.js server components.
// Falls back gracefully when backend is unavailable so ISR/SSG never fails.

const API_BASE = process.env.BACKEND_URL ?? "http://localhost:4000";

interface ApiGiftSet {
  id: string;
  slug: string;
  name: string;
  featured: boolean;
  tagline: string;
  blurb: string;
  badge: string | null;
  jar: string;
  color: string;
  base: string;
  deep: string;
  surface: string;
  usd: string;
  lkr: string;
  contents: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

function toGiftSet(g: ApiGiftSet): GiftSet {
  return {
    id: g.slug,   // UI uses id for DOM anchors — map slug → id
    name: g.name,
    featured: g.featured,
    tagline: g.tagline,
    blurb: g.blurb,
    badge: g.badge,
    jar: g.jar,
    color: g.color,
    base: g.base,
    deep: g.deep,
    surface: g.surface,
    usd: g.usd,
    lkr: g.lkr,
    contents: g.contents,
  };
}

export async function fetchGifts(featured?: boolean): Promise<GiftSet[] | null> {
  try {
    const qs = featured ? "?featured=true" : "";
    const res = await fetch(`${API_BASE}/gifts${qs}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json() as { gifts: ApiGiftSet[] };
    return data.gifts.map(toGiftSet);
  } catch {
    return null;
  }
}

export async function fetchGiftBySlug(slug: string): Promise<GiftSet | null> {
  try {
    const res = await fetch(`${API_BASE}/gifts/${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json() as { gift: ApiGiftSet };
    return toGiftSet(data.gift);
  } catch {
    return null;
  }
}
