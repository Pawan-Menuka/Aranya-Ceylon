import { apiFetch, getAccessToken } from "./http";
import type { Order, Product } from "../types";

// Admin endpoints (ADMIN / SUPERADMIN role-gated). Mutations return their
// canonical backend records; callers only apply success state after awaiting.

// ---- dashboard ----
export interface DashboardData {
  fxRate: number;
  revenue: {
    local: { total: number; currency: string; orders: number };
    international: { total: number; currency: string; orders: number };
  };
  orders: { localCount: number; intlCount: number; pendingFulfilment: number };
  series: Array<{
    date: string;
    label: string;
    all: number;
    local: number;
    international: number;
    orders: { all: number; local: number; international: number };
  }>;
  metrics: {
    today: { revenueUsd: DashboardMarketValues; orders: DashboardMarketValues };
    current30: { revenueUsd: DashboardMarketValues; orders: DashboardMarketValues; aovUsd: DashboardMarketValues };
    changes: {
      revenuePct: DashboardNullableMarketValues;
      ordersPct: DashboardNullableMarketValues;
      aovPct: DashboardNullableMarketValues;
    };
    newCustomers7d: number;
    conversionRate: number | null;
    conversionChangePct: number | null;
  };
  topProducts: Array<{ name: string; slug: string; revenue: number; units: number }>;
  lowStockVariants: Array<{ id: string; sku: string; stock: number; product: { name: string } }>;
  recentAuditLogs: AuditEntry[];
}

export function getDashboard(): Promise<DashboardData> {
  return apiFetch(`/admin/dashboard`, { auth: true });
}

// ---- orders ----
export interface AdminOrderPatch {
  status?: string;
  trackingNumber?: string;
}

export function listAdminOrders(params?: { status?: string; market?: string; q?: string; cursor?: string }): Promise<{ items: Order[]; nextCursor: string | null }> {
  const qs = new URLSearchParams();
  if (params?.status && params.status !== "all") qs.set("status", params.status);
  if (params?.market && params.market !== "all") qs.set("market", params.market);
  if (params?.q) qs.set("q", params.q);
  if (params?.cursor) qs.set("cursor", params.cursor);
  const s = qs.toString();
  return apiFetch(`/admin/orders${s ? `?${s}` : ""}`, { auth: true });
}

export function updateOrderStatus(id: string, patch: AdminOrderPatch): Promise<{ order: Order }> {
  return apiFetch(`/admin/orders/${encodeURIComponent(id)}`, { method: "PATCH", body: patch, auth: true });
}

export function refundOrder(id: string): Promise<{ order: Order }> {
  return apiFetch(`/admin/orders/${encodeURIComponent(id)}/refund`, { method: "POST", auth: true });
}

// ---- products ----
export interface AdminProductInput {
  name: string;
  slug?: string;
  description?: string;
  categoryId?: string;
  featured?: boolean;
  status?: string;
  latin?: string | null;
  variants?: Array<{
    id?: string;
    sku: string;
    weight: number;
    price: number;
    currency: string;
    market: string;
    stock?: number;
  }>;
}

export function listAdminProducts(): Promise<{ products: Product[] }> {
  return apiFetch(`/admin/products`, { auth: true });
}

export function createAdminProduct(input: AdminProductInput): Promise<{ product: Product }> {
  return apiFetch(`/admin/products`, { method: "POST", body: input, auth: true });
}

export function updateAdminProduct(id: string, input: Partial<AdminProductInput>): Promise<{ product: Product }> {
  return apiFetch(`/admin/products/${encodeURIComponent(id)}`, { method: "PATCH", body: input, auth: true });
}

export function archiveAdminProduct(id: string): Promise<void> {
  return apiFetch(`/admin/products/${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
}

// ---- blog ----
export type BlogPublishMode = "draft" | "schedule" | "now";

export interface AdminBlogPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  publishedAt: string | null;
  scheduledAt: string | null;
  viewCount: number;
  tags: string[];
  authorId?: string;
  // Present on the detail endpoint (getAdminBlog), not the list.
  content?: string;
  seoTitle?: string;
  seoDesc?: string;
}

export interface AdminBlogInput {
  title: string;
  slug: string;
  content: string;
  tags?: string[];
  status?: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  scheduledAt?: string;
  seoTitle?: string;
  seoDesc?: string;
}

export function listAdminBlogs(): Promise<{ blogs: AdminBlogPost[] }> {
  return apiFetch(`/admin/blogs`, { auth: true });
}

export function getAdminBlog(id: string): Promise<{ blog: AdminBlogPost }> {
  return apiFetch(`/admin/blogs/${encodeURIComponent(id)}`, { auth: true });
}

export function createBlog(input: AdminBlogInput): Promise<{ blog: AdminBlogPost }> {
  return apiFetch(`/admin/blogs`, { method: "POST", body: input, auth: true });
}

export function updateBlog(id: string, input: Partial<AdminBlogInput>): Promise<{ blog: AdminBlogPost }> {
  return apiFetch(`/admin/blogs/${encodeURIComponent(id)}`, { method: "PATCH", body: input, auth: true });
}

export function deleteBlog(id: string): Promise<void> {
  return apiFetch(`/admin/blogs/${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
}

// ---- recipes (admin) ----
export interface AdminRecipe {
  id: string;
  slug: string;
  title: string;
  course: string;
  difficulty: string;
  featured: boolean;
  status: string;
  prepMins: number;
  cookMins: number;
  serves: number;
  createdAt: string;
  // Present on the detail endpoint; omitted by the list endpoint.
  dek?: string;
  accent?: string;
  slot?: string;
  intro?: string;
  spices?: string[];
  ingredients?: Array<{ group?: string; items: string[] }>;
  method?: string[];
  tips?: string[];
}

export interface AdminRecipeInput {
  title: string;
  slug: string;
  dek: string;
  course: string;
  accent?: string;
  slot?: string;
  featured?: boolean;
  prepMins?: number;
  cookMins?: number;
  serves?: number;
  difficulty?: string;
  intro?: string;
  spices?: string[];
  ingredients?: Array<{ group?: string; items: string[] }>;
  method?: string[];
  tips?: string[];
  status?: "DRAFT" | "PUBLISHED";
}

export function listAdminRecipes(): Promise<{ recipes: AdminRecipe[] }> {
  return apiFetch(`/admin/recipes`, { auth: true });
}

export function getAdminRecipe(id: string): Promise<{ recipe: AdminRecipe }> {
  return apiFetch(`/admin/recipes/${encodeURIComponent(id)}`, { auth: true });
}

export function createRecipe(input: AdminRecipeInput): Promise<{ recipe: AdminRecipe }> {
  return apiFetch(`/admin/recipes`, { method: "POST", body: input, auth: true });
}

export function updateRecipe(id: string, input: Partial<AdminRecipeInput>): Promise<{ recipe: AdminRecipe }> {
  return apiFetch(`/admin/recipes/${encodeURIComponent(id)}`, { method: "PATCH", body: input, auth: true });
}

export function deleteRecipe(id: string): Promise<void> {
  return apiFetch(`/admin/recipes/${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
}

// ---- gifts (admin) ----
export interface AdminGiftSet {
  id: string;
  slug: string;
  name: string;
  featured: boolean;
  badge: string | null;
  usd: string;
  lkr: string;
  jar: string;
  status: string;
  contents: string[];
  createdAt: string;
  // Present on the detail endpoint; omitted by the list endpoint.
  tagline?: string;
  blurb?: string;
  color?: string;
  base?: string;
  deep?: string;
  surface?: string;
}

export interface AdminGiftInput {
  slug: string;
  name: string;
  featured?: boolean;
  tagline: string;
  blurb: string;
  badge?: string | null;
  jar?: string;
  color?: string;
  base?: string;
  deep?: string;
  surface?: string;
  usd: string;
  lkr: string;
  contents: string[];
  status?: "DRAFT" | "PUBLISHED";
}

export function listAdminGifts(): Promise<{ gifts: AdminGiftSet[] }> {
  return apiFetch(`/admin/gifts`, { auth: true });
}

interface DashboardMarketValues { all: number; local: number; international: number }
interface DashboardNullableMarketValues { all: number | null; local: number | null; international: number | null }

export function getAdminGift(id: string): Promise<{ gift: AdminGiftSet }> {
  return apiFetch(`/admin/gifts/${encodeURIComponent(id)}`, { auth: true });
}

export function createGift(input: AdminGiftInput): Promise<{ gift: AdminGiftSet }> {
  return apiFetch(`/admin/gifts`, { method: "POST", body: input, auth: true });
}

export function updateGift(id: string, input: Partial<AdminGiftInput>): Promise<{ gift: AdminGiftSet }> {
  return apiFetch(`/admin/gifts/${encodeURIComponent(id)}`, { method: "PATCH", body: input, auth: true });
}

export function deleteGift(id: string): Promise<void> {
  return apiFetch(`/admin/gifts/${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
}

// ---- audit ----
export interface AuditEntry {
  id: string;
  event: string;
  actorId: string;
  actorRole: string;
  targetType: string | null;
  targetId: string | null;
  meta: unknown;
  createdAt: string;
  actor?: { name: string; email: string };
}

export async function listAuditLogs(params?: { limit?: number; cursor?: string }): Promise<{ logs: AuditEntry[]; nextCursor: string | null }> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.cursor) qs.set("cursor", params.cursor);
  const s = qs.toString();
  // Backend returns { items, nextCursor }; the audit page consumes { logs }.
  // Map here so the live audit trail renders instead of staying on demo data (BUG-14).
  const res = await apiFetch<{ items: AuditEntry[]; nextCursor: string | null }>(
    `/admin/audit-logs${s ? `?${s}` : ""}`,
    { auth: true },
  );
  return { logs: res.items ?? [], nextCursor: res.nextCursor ?? null };
}

// ---- categories ----
export interface Category {
  id: string;
  name: string;
  slug: string;
  _count?: { products: number };
}

export function listCategories(): Promise<{ categories: Category[] }> {
  return apiFetch(`/categories`, { auth: true });
}

// ---- image upload (multipart — bypasses apiFetch's JSON body handling) ----
export async function uploadProductImage(
  productId: string,
  file: File,
): Promise<{ images: Array<{ id: string; url: string }> }> {
  const formData = new FormData();
  formData.append("images", file);
  const token = getAccessToken();
  const res = await fetch(
    `/api/products/${encodeURIComponent(productId)}/images`,
    {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    },
  );
  if (!res.ok) throw new Error(`Image upload failed (${res.status})`);
  return res.json();
}
