// Read-model types mirroring the backend's /products response shape
// (product.controller.listProducts + buildProductIncludes). Prisma Decimal
// fields serialize to strings over JSON.

export type VariantMarket = "LOCAL" | "INTERNATIONAL" | "BOTH";
export type Currency = "LKR" | "USD" | "EUR" | "GBP";
import type { Market } from "../market";

export interface ApiVariant {
  id: string;
  weight: number;
  price: string; // Decimal → string
  sku: string;
  stock: number;
  market: VariantMarket;
  currency: Currency;
  packagingType: string | null;
  packagingDesc: string | null;
}

export interface ApiImage {
  id: string;
  url: string;
  altText: string | null;
  position: number;
}

export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
}

export interface ApiReview {
  id: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string };
}

export interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  certifications: string[];
  featured: boolean;
  market: VariantMarket;
  latin: string | null;
  originLabel: string | null;
  color: string | null;
  category: ApiCategory | null;
  variants: ApiVariant[];
  images: ApiImage[];
  reviews?: ApiReview[]; // only on the single-product endpoint
  ratingAvg: number;
  _count?: { reviews: number; orderItems: number };
  createdAt: string;
}

export interface SingleProductResponse {
  product: ApiProduct | null;
  market: Market;
}

// ── Cart (GET /cart response) ───────────────────────────────────────────
export interface ApiCartItem {
  id: string;
  quantity: number;
  productId: string;
  variantId: string;
  product: { name: string; slug: string; images: ApiImage[] };
  variant: { id: string; weight: number; price: string; currency: Currency; market: VariantMarket };
}

export interface ApiCart {
  id: string;
  userId: string | null;
  guestToken: string | null;
  couponId: string | null;
  items: ApiCartItem[];
}

export interface CartResponse {
  cart: ApiCart;
  market: Market;
}

// ── Orders (GET /orders response) ───────────────────────────────────────
export interface ApiOrderItem {
  quantity: number;
  unitPrice: string;
  product: { name: string; slug: string };
  variant: { weight: number };
}
export interface ApiOrderEvent {
  status: string;
  note: string | null;
  createdAt: string;
}
export interface ApiOrder {
  id: string;
  status: string;
  total: string;
  currency: "LKR" | "USD";
  createdAt: string;
  trackingNumber: string | null;
  items: ApiOrderItem[];
  timeline: ApiOrderEvent[];
}

// Client-facing cart view (adapter output, cents-correct).
export interface CartItemView {
  id: string;
  name: string;
  slug: string;
  weight: number;
  qty: number;
  unitPrice: string; // formatted
  lineTotal: string; // formatted
  imageUrl: string | null;
  color: string;
}

export interface CartView {
  items: CartItemView[];
  count: number; // total quantity
  subtotal: string; // formatted
  subtotalCents: number;
  currency: "LKR" | "USD";
}

export interface ProductListResponse {
  items: ApiProduct[];
  nextCursor: string | null;
  hasNextPage: boolean;
  market: Market;
}

// Detail-page view models (adapter output).
export interface VariantView {
  id: string;
  weight: number;
  label: string; // "100g"
  price: string; // formatted for the active market
  priceAmount: number; // numeric, for JSON-LD offers + cart
  stock: number;
  sku: string;
}

export interface ReviewView {
  id: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  date: string; // ISO
}

export interface ProductDetailView {
  id: string;
  slug: string;
  name: string;
  latin: string;
  origin: string;
  description: string;
  color: string;
  category: string;
  certifications: string[];
  badge: string | null;
  rating: number;
  reviewCount: number;
  currency: "LKR" | "USD";
  variants: VariantView[];
  images: { url: string; alt: string }[];
  reviews: ReviewView[];
}

// View model the cards/grid consume (adapter output).
export interface ProductView {
  id: string;
  slug: string;
  name: string;
  latin: string;
  origin: string;
  rating: number;
  color: string; // per-spice accent (CardCFinal top stripe)
  badge: string | null;
  price: string; // formatted for the active market
  currency: "LKR" | "USD";
  weights: string[]; // e.g. ["50g","100g","250g"]
  category: string;
  featured: boolean;
  imageUrl: string | null;
}
