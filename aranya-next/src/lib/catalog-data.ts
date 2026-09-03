import type { CatalogSpice, FacetVocab, Product } from "./types";
import { toSpice } from "./spice-data";

// Catalog demo dataset (ported from catalog-data.js) — the SSG/ISR fallback for
// /products when the API is unreachable. Prices are the 100g price.
export const CATALOG: CatalogSpice[] = [
  { slug: "ceylon-cinnamon-quills", name: "Ceylon Cinnamon Quills", latin: "Cinnamomum verum", origin: "Matale Hills",
    color: "#B5651D", base: "#C2772E", deep: "#7E481A", surface: "#F3E7D4", rating: 4.9, reviews: 412, badge: "Bestseller",
    usd: "$14.50", lkr: "Rs 2,150", weights: ["50g", "100g", "250g"],
    category: "Whole Spices", form: "Whole", flavour: ["Sweet", "Warm", "Citrus"], popularity: 98, added: "2025-08-01", featured: true },
  { slug: "ceylon-cinnamon-ground", name: "Ceylon Cinnamon, Ground", latin: "Cinnamomum verum", origin: "Matale Hills",
    color: "#A85A1B", base: "#B86B28", deep: "#723F16", surface: "#F0E2CE", rating: 4.8, reviews: 263, badge: "In Stock",
    usd: "$13.00", lkr: "Rs 1,930", weights: ["50g", "100g", "250g"],
    category: "Ground", form: "Ground", flavour: ["Sweet", "Warm"], popularity: 81, added: "2025-09-15", featured: false },
  { slug: "green-cardamom-pods", name: "Green Cardamom Pods", latin: "Elettaria cardamomum", origin: "Kandy District",
    color: "#7C9A5A", base: "#93AE6A", deep: "#566F37", surface: "#EAEFDD", rating: 4.8, reviews: 286, badge: "GI Certified",
    usd: "$18.00", lkr: "Rs 2,680", weights: ["50g", "100g", "250g"],
    category: "Whole Spices", form: "Whole", flavour: ["Citrus", "Floral", "Sweet"], popularity: 90, added: "2025-07-20", featured: true },
  { slug: "whole-cloves", name: "Whole Cloves", latin: "Syzygium aromaticum", origin: "Kegalle",
    color: "#6B4226", base: "#7A4A2A", deep: "#462914", surface: "#EBDDCD", rating: 4.9, reviews: 198, badge: "In Stock",
    usd: "$11.25", lkr: "Rs 1,670", weights: ["50g", "100g", "250g"],
    category: "Whole Spices", form: "Whole", flavour: ["Warm", "Pungent"], popularity: 72, added: "2025-06-10", featured: false },
  { slug: "whole-nutmeg", name: "Whole Nutmeg", latin: "Myristica fragrans", origin: "Sabaragamuwa",
    color: "#A9683C", base: "#B57441", deep: "#7A451F", surface: "#F0E2D2", rating: 4.7, reviews: 154, badge: "In Stock",
    usd: "$16.75", lkr: "Rs 2,490", weights: ["50g", "100g", "250g"],
    category: "Whole Spices", form: "Whole", flavour: ["Warm", "Sweet"], popularity: 64, added: "2025-05-30", featured: false },
  { slug: "black-peppercorns", name: "Black Peppercorns", latin: "Piper nigrum", origin: "Hill Country",
    color: "#3C3A36", base: "#54504A", deep: "#26241F", surface: "#E6E2DA", rating: 4.8, reviews: 331, badge: "Bestseller",
    usd: "$9.90", lkr: "Rs 1,470", weights: ["50g", "100g", "250g"],
    category: "Whole Spices", form: "Whole", flavour: ["Pungent", "Citrus"], popularity: 93, added: "2025-04-18", featured: true },
  { slug: "ground-turmeric", name: "Ground Turmeric", latin: "Curcuma longa", origin: "Southern Province",
    color: "#D99A1C", base: "#E2A62B", deep: "#A8740F", surface: "#F6E9C9", rating: 4.9, reviews: 507, badge: "GI Certified",
    usd: "$8.50", lkr: "Rs 1,260", weights: ["50g", "100g", "250g"],
    category: "Ground", form: "Ground", flavour: ["Earthy", "Warm"], popularity: 96, added: "2025-03-05", featured: false },
  { slug: "white-peppercorns", name: "White Peppercorns", latin: "Piper nigrum", origin: "Hill Country",
    color: "#B8B0A0", base: "#C9C2B4", deep: "#8A8276", surface: "#EDEAE2", rating: 4.7, reviews: 88, badge: "In Stock",
    usd: "$12.40", lkr: "Rs 1,840", weights: ["50g", "100g", "250g"],
    category: "Whole Spices", form: "Whole", flavour: ["Pungent", "Earthy"], popularity: 51, added: "2025-10-02", featured: false },
  { slug: "mace-blades", name: "Mace Blades", latin: "Myristica fragrans", origin: "Sabaragamuwa",
    color: "#C0531F", base: "#D06A2E", deep: "#8F3A14", surface: "#F4E0D2", rating: 4.8, reviews: 64, badge: "New",
    usd: "$21.00", lkr: "Rs 3,120", weights: ["50g", "100g", "250g"],
    category: "Whole Spices", form: "Whole", flavour: ["Warm", "Floral"], popularity: 38, added: "2026-04-12", featured: false },
  { slug: "ground-ginger", name: "Ground Ginger", latin: "Zingiber officinale", origin: "Gampaha District",
    color: "#C99A4E", base: "#D6AA5E", deep: "#9A7030", surface: "#F3E8D2", rating: 4.7, reviews: 121, badge: "In Stock",
    usd: "$10.25", lkr: "Rs 1,520", weights: ["50g", "100g", "250g"],
    category: "Ground", form: "Ground", flavour: ["Warm", "Pungent", "Citrus"], popularity: 59, added: "2025-11-08", featured: false },
  { slug: "ceylon-curry-powder", name: "Ceylon Curry Powder", latin: "Roasted estate blend", origin: "Blended in Kandy",
    color: "#9A5B22", base: "#AC6C2D", deep: "#6E3F16", surface: "#EFE2CE", rating: 4.9, reviews: 274, badge: "Bestseller",
    usd: "$13.75", lkr: "Rs 2,040", weights: ["50g", "100g", "250g"],
    category: "Blends", form: "Ground", flavour: ["Earthy", "Warm", "Pungent"], popularity: 88, added: "2025-02-14", featured: true },
  { slug: "kandyan-garam-masala", name: "Kandyan Garam Masala", latin: "Hand-ground blend", origin: "Blended in Kandy",
    color: "#7A3E22", base: "#8C4D2C", deep: "#552816", surface: "#ECDDD0", rating: 4.8, reviews: 96, badge: "New",
    usd: "$15.50", lkr: "Rs 2,300", weights: ["50g", "100g", "250g"],
    category: "Blends", form: "Ground", flavour: ["Warm", "Pungent", "Sweet"], popularity: 47, added: "2026-03-22", featured: false },
];

// Facet vocabularies (order matters for the UI). The page derives live facets
// from the loaded products and hides empty ones; this is the fallback ordering.
export const CATALOG_FACETS: FacetVocab = {
  category: ["Whole Spices", "Ground", "Blends"],
  form: ["Whole", "Ground"],
  origin: ["Matale Hills", "Kandy District", "Kegalle", "Sabaragamuwa", "Hill Country", "Southern Province", "Gampaha District", "Blended in Kandy"],
  flavour: ["Sweet", "Warm", "Citrus", "Floral", "Pungent", "Earthy"],
};

// Sort options: [value, label]
export const CATALOG_SORTS: [string, string][] = [
  ["featured", "Featured"],
  ["best", "Best-selling"],
  ["price-asc", "Price: Low to High"],
  ["price-desc", "Price: High to Low"],
  ["rating", "Top-rated"],
  ["new", "Newest"],
];

// Adapter: live Product -> CatalogSpice (spec §8). Adds the facet/sort fields on
// top of the base Spice mapping so the ported filter UI works unchanged.
function deriveForm(p: Product): string {
  return /ground|powder|masala|blend/i.test(`${p.name} ${p.category?.name ?? ""}`) ? "Ground" : "Whole";
}
function deriveCategory(p: Product): string {
  if (p.category?.name) return p.category.name;
  return deriveForm(p) === "Ground" ? "Ground" : "Whole Spices";
}

export function toCatalogSpice(p: Product): CatalogSpice {
  const base = toSpice(p);
  return {
    ...base,
    category: deriveCategory(p),
    form: deriveForm(p),
    flavour: p.flavour ?? [],
    popularity: p._count?.orderItems ?? 0,
    added: p.createdAt || new Date().toISOString(),
    featured: !!p.featured,
  };
}

export function parsePrice(p: string): number {
  return parseFloat(String(p).replace(/[^0-9.]/g, "")) || 0;
}
