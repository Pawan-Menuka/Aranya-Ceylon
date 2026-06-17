import { apiFetch } from "./http";
import type { Order, Product } from "../types";

// Admin endpoints (ADMIN / SUPERADMIN role-gated). Optimistic local state stays
// authoritative offline; these are best-effort syncs to the backend.

// ---- dashboard ----
export interface DashboardData {
  revenue: {
    local: { total: number; currency: string; orders: number };
    international: { total: number; currency: string; orders: number };
  };
  orders: { localCount: number; intlCount: number; pendingFulfilment: number };
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
  variants?: Array<{
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

export function listAuditLogs(params?: { limit?: number; cursor?: string }): Promise<{ logs: AuditEntry[]; nextCursor: string | null }> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.cursor) qs.set("cursor", params.cursor);
  const s = qs.toString();
  return apiFetch(`/admin/audit-logs${s ? `?${s}` : ""}`, { auth: true });
}

// Fire-and-forget: attempt a backend write, swallow failures so optimistic
// local state stays authoritative offline (acceptance criterion §11).
export function bestEffort<T>(p: Promise<T>): void {
  p.catch(() => {
    /* offline / demo — local state already updated */
  });
}
