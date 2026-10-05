// Aranya Ceylon — API read models (mirrors backend spec §8).

export type Currency = "LKR" | "USD" | "EUR" | "GBP";
type VariantMarket = "LOCAL" | "INTERNATIONAL" | "BOTH";
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

interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  position: number;
}

interface Review {
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
  flavour?: string[];
  color?: string; // #hex accent
  category?: { id: string; name: string; slug: string };
  variants: Variant[];
  images: ProductImage[];
  reviews?: Review[];
  ratingAvg: number;
  _count?: { reviews: number; orderItems: number };
  createdAt: string;
}

/** Public catalog cards omit detail text and review bodies. */
export type ProductCard = Omit<Product, "description" | "status" | "reviews">;

export interface ProductCardPage extends Paginated<ProductCard> {
  total: number;
  facets: FacetVocab;
  featured: ProductCard[];
  market: BackendMarket;
}

export interface CategorySummary {
  groups: { name: string; count: number; spices: ProductCard[] }[];
  facets: { flavour: { name: string; count: number; sample: ProductCard | null }[] };
}

export interface CatalogPage extends Omit<ProductCardPage, "items" | "featured"> {
  items: CatalogSpice[];
  featured: CatalogSpice[];
  demo?: boolean;
}

export interface CatalogCategoryGroup {
  name: string;
  count: number;
  spices: CatalogSpice[];
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

interface OrderItem {
  quantity: number;
  unitPrice: string;
  product: { id?: string; name: string; slug: string };
  variant: { id?: string; weight: number };
}
interface OrderTimelineEntry {
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
  paymentIntentId?: string | null;
  guestEmail?: string | null;
  shippingCost: string;
  discount: string;
  shippingAddress: { city?: string; country?: string; firstName?: string; lastName?: string; [key: string]: unknown };
  coupon?: { code: string } | null;
  items: OrderItem[];
  timeline?: OrderTimelineEntry[];
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
  imageSrc?: string;
  imageSources?: string[];
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
  // Backend linkage — present when the Spice was adapted from a live Product
  // (toSpice). Lets cards/quick-add resolve the real variant + price so items
  // added anywhere reach the server cart and are charged correctly (BUG-01/26).
  productId?: string;
  variants?: Variant[];
  // Real product certifications + approved reviews, so the detail page can show
  // genuine data instead of fabricated certification claims / demo reviews
  // (BUG-20). Absent for demo/offline Spice objects.
  certifications?: string[];
  reviewItems?: Review[];
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

// Search uses the public card/list projections; article bodies and product
// descriptions/reviews are intentionally absent from result payloads.
export type SearchSort = "relevance" | "price-asc" | "price-desc" | "rating";
export type SearchResource = "all" | "products" | "journal";
export interface SearchResultPage<T> { items: T[]; total: number; nextCursor: string | null; hasNextPage: boolean }
interface JournalSearchMetadata {
  id: string; title: string; slug: string; tags: string[];
  publishedAt: string | null; seoDesc: string | null; viewCount: number;
}
export interface SearchResults {
  q: string; sort: SearchSort; market: BackendMarket;
  products: SearchResultPage<ProductCard>; journal: SearchResultPage<JournalSearchMetadata>;
}
