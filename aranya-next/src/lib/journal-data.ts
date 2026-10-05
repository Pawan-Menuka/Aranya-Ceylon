import type { Blog } from "./types";

// Journal/article view model (ported from journal-data.js). Live Blog posts map
// onto this via toPost(); the demo set is the SSG/ISR fallback and powers the
// search index alongside the catalog.
export interface PostBlock {
  t: "h" | "p" | "quote" | "img";
  text?: string;
  by?: string;
  id?: string;
  cap?: string;
}
export interface Post {
  slug: string;
  title: string;
  dek: string;
  category: string;
  author: string;
  role: string;
  date: string;
  readTime: string;
  accent: string;
  slot: string;
  featured: boolean;
  body?: PostBlock[];
}


// Curated cover slots for the launch articles, by slug: a live post that
// replaces one keeps its photography. A literal map rather than a lookup into
// the demo set, so toPost (used client-side) does not pull the demo articles
// into the browser bundle (audit #54).
const CURATED_SLOTS: Record<string, string> = {
  "true-cinnamon": "post-cinnamon",
  "cardamom-by-hand": "post-cardamom",
  "from-peel-to-pouch": "post-process",
  "pepper-in-the-mist": "post-pepper",
  "name-means-forest": "post-heritage",
};

// Adapter: live Blog -> Post (spec §8). Strips MDX to a plain dek for the search
// index / list cards; the article page renders the full content separately.
const ACCENTS = ["#B5651D", "#7C9A5A", "#3C3A36", "#1D9E75", "#54504A", "#0F6E56", "#D99A1C"];
function hashIndex(key: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % mod;
}
function readingTime(mdx: string): string {
  const words = (mdx || "").replace(/[#>*_`\[\]()]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200)) + " min";
}
function dekFrom(b: Blog): string {
  if (b.seoDesc) return b.seoDesc;
  const plain = (b.content || "").replace(/[#>*_`]/g, "").replace(/\[(.*?)\]\(.*?\)/g, "$1").trim();
  return plain.slice(0, 180);
}
// Convert light inline markdown to the small HTML subset the article renderer
// sanitises + allows (strong/em/a). Anything else stays literal text.
function inlineMarkdown(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\*)([^*]+?)\*/g, "$1<em>$2</em>")
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

// Map a live post's MDX/markdown `content` into the PostBlock[] the article page
// renders. Without this, toPost never populated `body`, so every live article
// fell back to canned placeholder prose (BUG-09b). Paragraph text is sanitised
// at the server page boundary; headings/quotes render as escaped React text.
function contentToBlocks(content: string): PostBlock[] {
  const blocks: PostBlock[] = [];
  for (const raw of (content || "").replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const para = raw.trim();
    if (!para) continue;
    const heading = para.match(/^(#{1,6})\s+(.*)$/);
    if (heading) { blocks.push({ t: "h", text: heading[2].trim() }); continue; }
    if (para.startsWith(">")) { blocks.push({ t: "quote", text: para.replace(/^>\s?/gm, "").trim() }); continue; }
    blocks.push({ t: "p", text: inlineMarkdown(para.replace(/\n/g, " ").trim()) });
  }
  return blocks;
}

export function toPost(b: Blog): Post {
  const body = contentToBlocks(b.content);
  return {
    slug: b.slug,
    title: b.title,
    dek: dekFrom(b),
    category: b.tags?.[0] || "Journal",
    author: "Aranya Ceylon",
    role: "",
    date: b.publishedAt ? new Date(b.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
    readTime: readingTime(b.content),
    accent: ACCENTS[hashIndex(b.slug, ACCENTS.length)],
    // Reuse the curated cover slot when a live post replaces its demo article.
    slot: CURATED_SLOTS[b.slug] ?? "post-" + b.slug,
    featured: false,
    // Real article body from content; falls back to canned prose only when empty.
    ...(body.length ? { body } : {}),
  };
}

// Fallback body for posts authored without a full `body` (ported from article.jsx).
export function fallbackBody(post: Post): PostBlock[] {
  return [
    { t: "p", text: "Every spice we sell carries a story like this one — of a hillside, a season, and a pair of hands that knew exactly when to pick. " + post.dek },
    { t: "h", text: "Single-origin, by conviction" },
    { t: "p", text: "We trace each lot to a named estate or smallholding, visit at harvest, and taste at the source. What grows on one hillside arrives in one pouch — no blending, no bulking, no anonymity." },
    { t: "quote", text: "Spice, as the forest intended.", by: "Aranya Ceylon" },
    { t: "p", text: "It is slower and costlier than the warehouse model, and it is the only way we know to keep the aroma that made the spice worth growing. The difference, once you cook with it, stops being a claim and becomes obvious." },
    { t: "img", id: post.slot + "-body", cap: "From the hill forests of " + (post.category === "Recipes" ? "Sri Lanka" : "the Central Highlands") + "." },
    { t: "p", text: "If you have a question about where a particular lot came from, ask us — we can usually name the grower." },
  ];
}
