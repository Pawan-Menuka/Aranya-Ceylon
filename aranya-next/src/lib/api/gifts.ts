import type { GiftSet } from "@/lib/gifts-data";
import type { Variant } from "@/lib/types";
import { formatMoney } from "@/lib/money";

// Server-side only — called from Next.js server components.
// Dynamic SSR shares verified-market public data. Backing product mutations
// invalidate these reads too; production transport failures offer retry.
import { publicApiFetch } from "./public";
import { rethrowReadFailure } from "./read-failure";

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
  usd: string; // Prisma Decimal serialised as a numeric string, e.g. "28.50"
  lkr: string; // e.g. "4250"
  contents: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  // Backing product link (gift.controller attachBackingProducts).
  productId?: string | null;
  variants?: Variant[];
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
    // Format the Decimal price into the display strings the storefront UI
    // expects ("$28.50" / "Rs 4,250") — same helper products use.
    usd: formatMoney(g.usd, "USD"),
    lkr: formatMoney(g.lkr, "LKR"),
    contents: g.contents,
    // Thread the backing product + variants through so the gift is addable to
    // the real cart (resolved by lineFromSpice on add).
    ...(g.productId ? { productId: g.productId } : {}),
    ...(g.variants ? { variants: g.variants } : {}),
  };
}

export async function fetchGifts(featured?: boolean): Promise<GiftSet[] | null> {
  try {
    const qs = featured ? "?featured=true" : "";
    const data = await publicApiFetch<{ gifts: ApiGiftSet[] }>(`/gifts${qs}`, { revalidate: 3600 });
    return data.gifts.map(toGiftSet);
  } catch (error) {
    rethrowReadFailure(error);
    return null;
  }
}

