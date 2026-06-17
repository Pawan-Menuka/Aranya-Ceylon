// Aranya Ceylon — API read models (mirrors backend spec §8).

export type Currency = "LKR" | "USD" | "EUR" | "GBP";
export type VariantMarket = "LOCAL" | "INTERNATIONAL" | "BOTH";
export type Market = "intl" | "local";

/** Backend market token <-> UI market token. */
export type BackendMarket = "INTERNATIONAL" | "LOCAL";

export interface Variant {
  id: string;
  weight: number; // grams
  price: string; // Prisma Decimal serialises as string, e.g. "14.50"
  sku: string;
  stock: number;
  market: VariantMarket;
  currency: Currency;
}

export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  position: number;
}

export interface Review {
  id: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string };
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  certifications: string[];
  featured: boolean;
  status?: string; // "ACTIVE" | "ARCHIVED" | "DRAFT" (returned by admin endpoints)
  latin?: string;
  originLabel?: string;
  color?: string; // #hex accent
  category?: { id: string; name: string; slug: string };
  variants: Variant[];
  images: ProductImage[];
  reviews?: Review[];
  ratingAvg: number;
  _count?: { reviews: number; orderItems: number };
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  _count?: { products: number };
}

export interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string; // MDX
  tags: string[];
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  publishedAt?: string;
  scheduledAt?: string;
  viewCount: number;
  seoTitle?: string;
  seoDesc?: string;
}

export interface OrderItem {
  quantity: number;
  unitPrice: string;
  product: { name: string; slug: string };
  variant: { weight: number };
}
export interface OrderTimelineEntry {
  status: string;
  note?: string;
  createdAt: string;
}
export interface Order {
  id: string;
  status: string;
  total: string;
  currency: "LKR" | "USD";
  market: BackendMarket;
  createdAt: string;
  trackingNumber?: string;
  items: OrderItem[];
  timeline: OrderTimelineEntry[];
  user?: { id: string; name: string; email: string };
}

export interface CartItem {
  id: string;
  quantity: number;
  product: Pick<Product, "id" | "name" | "slug" | "color" | "images">;
  variant: Variant;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: string;
  discount?: string;
  total: string;
  currency: Currency;
  couponCode?: string;
}

// ---- Paginated envelopes ----
export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
  market?: BackendMarket;
}

// ----------------------------------------------------------------------------
// UI view model
// ----------------------------------------------------------------------------
// The prototype cards/sections were written against a flat "spice" object.
// `Spice` is that shape; `toSpice()` (lib/adapters) maps a live Product onto it
// so every ported component renders unchanged whether data is live or demo.
export interface Spice {
  slug?: string;
  name: string;
  latin: string;
  origin: string;
  color: string;
  base: string;
  deep: string;
  surface: string;
  rating: number;
  reviews: number;
  badge: string;
  usd: string;
  lkr: string;
  weights: string[];
}

// Catalog view model = Spice + the facet/sort fields the /products page filters on
// (ported from catalog-data.js). Facets are derived from the loaded set, so a
// live Product only needs to populate these for filtering to light up.
export interface CatalogSpice extends Spice {
  category: string; // "Whole Spices" | "Ground" | "Blends" | live category name
  form: string; // "Whole" | "Ground"
  flavour: string[];
  popularity: number;
  added: string; // ISO date — newest sort
  featured: boolean;
}

export interface FacetVocab {
  category: string[];
  form: string[];
  origin: string[];
  flavour: string[];
}
