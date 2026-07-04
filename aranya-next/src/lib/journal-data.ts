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

// "Recipes" lives entirely in /recipes (rich detail pages). The Journal is
// sourcing stories, spice notes and heritage — no recipe stubs here.
export const JOURNAL_CATEGORIES = ["All", "Sourcing", "Spice Notes", "Heritage"];

export const JOURNAL: Post[] = [
  {
    slug: "true-cinnamon",
    title: "True cinnamon, and why it ruins you for the supermarket jar",
    dek: "Once you've tasted a hand-rolled Ceylon quill dissolve to silk in warm milk, the hard cassia in most kitchens never tastes the same again.",
    category: "Spice Notes", author: "Devika R.", role: "Head of Sourcing",
    date: "May 28, 2026", readTime: "6 min", accent: "#B5651D", slot: "post-cinnamon", featured: true,
    body: [
      { t: "p", text: "There is a moment, the first time you steep a real Ceylon quill in hot milk, when you realise you have been lied to for years. The bark does not just flavour the milk — it <em>perfumes</em> it, honeyed and floral, with a whisper of clove and citrus underneath. Then it dissolves, leaving no grit, no blunt heat, nothing to chew around. That is true cinnamon, and it is a different plant from what fills most jars." },
      { t: "h", text: "Cassia is not cinnamon" },
      { t: "p", text: "Most of the world's \"cinnamon\" is cassia — a hardier, cheaper bark from a different tree, darker and thicker, with a coarse heat driven by high levels of a compound called coumarin. It has its uses. But it is to Ceylon cinnamon what cooking wine is to Burgundy: related, and not the same conversation." },
      { t: "quote", text: "Grade your bark by the candle, not the colour — the truest quill lets the light through.", by: "A Matale peeler's proverb" },
      { t: "h", text: "How to tell the difference" },
      { t: "p", text: "True cinnamon quills are pale tan, thin as parchment, and rolled in many fragile layers like a cigar. Snap one and it crumbles. Cassia is reddish-brown, hard, and curls into a single thick scroll. If it fights your spice grinder, it is cassia." },
      { t: "img", id: "post-cinnamon-detail", cap: "Hand-rolled quills, peeled in the wet season above Matale." },
      { t: "p", text: "The flavour follows the form. Ceylon is delicate and complex — built for sweet bakes, slow braises, and anything milky. Cassia is loud and one-note — fine for a cinnamon roll that is mostly sugar anyway. Cook with the real thing once and the difference stops being a marketing claim and becomes the plainest thing in the world." },
    ],
  },
  {
    slug: "cardamom-by-hand",
    title: "Why cardamom has to be picked by hand, three times a season",
    dek: "The greenest pods hold the loudest oils — but they ripen on their own clock, so the harvest is walked plant by plant.",
    category: "Sourcing", author: "Nuwan F.", role: "Field Buyer",
    date: "May 14, 2026", readTime: "5 min", accent: "#7C9A5A", slot: "post-cardamom", featured: false,
    body: [
      { t: "p", text: "Cardamom hides low in the shade of the Kandyan forest, and it refuses to ripen all at once. Each pod keeps its own schedule, which means a single plant is picked over and over across a season — three or four passes, sometimes more." },
      { t: "h", text: "Picked green on purpose" },
      { t: "p", text: "Snip the pod a touch early and it stays a vivid grass-green, locking the volatile oils inside before sun or heat can drive them off. Wait for gold and much of the perfume has already escaped. The greenest pods cost the most to harvest and are worth every rupee." },
      { t: "quote", text: "Pick it green and you keep the perfume; wait for gold and it has already half escaped.", by: "A Kandy estate picker" },
      { t: "p", text: "This is why machine harvest never took: a machine cannot tell a ready pod from its neighbour. Only a hand can, and only an experienced one." },
    ],
  },
  {
    slug: "from-peel-to-pouch",
    title: "From peel to pouch: the three weeks that decide everything",
    dek: "Aroma fades, so we move fast. A look at how a quill gets from a hillside above Matale to a sealed pouch on your shelf.",
    category: "Sourcing", author: "Devika R.", role: "Head of Sourcing",
    date: "April 12, 2026", readTime: "7 min", accent: "#1D9E75", slot: "post-process", featured: false,
  },
  {
    slug: "pepper-in-the-mist",
    title: "The king of spices, grown in the mist",
    dek: "Hill-country pepper is hotter and more floral than the lowland bulk — and the difference is mostly altitude and patience.",
    category: "Spice Notes", author: "Nuwan F.", role: "Field Buyer",
    date: "March 26, 2026", readTime: "5 min", accent: "#54504A", slot: "post-pepper", featured: false,
  },
  {
    slug: "name-means-forest",
    title: "Aranya means the forest",
    dek: "On a three-thousand-year-old trade, a Sanskrit word for wild woodland, and why a spice company would name itself after trees.",
    category: "Heritage", author: "Devika R.", role: "Head of Sourcing",
    date: "March 8, 2026", readTime: "4 min", accent: "#0F6E56", slot: "post-heritage", featured: false,
  },
];

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
// at render time (ArticleBody → sanitizeHtml); headings/quotes render as text.
export function contentToBlocks(content: string): PostBlock[] {
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
    slot: "post-" + b.slug,
    featured: false,
    // Real article body from content; falls back to canned prose only when empty.
    ...(body.length ? { body } : {}),
  };
}

export function getPost(slug: string): Post | undefined {
  return JOURNAL.find((p) => p.slug === slug);
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
