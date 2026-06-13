// Read-model types for the admin API (backend src/controllers/admin/*). Prisma
// Decimal fields serialize to strings over JSON; only fields the UI reads are typed.

export interface AdminAuditLog {
  id: string;
  event: string;
  targetType: string | null;
  targetId: string | null;
  actorId: string | null;
  diff: unknown;
  createdAt: string;
  actor: { name: string; email: string } | null;
}

export interface AdminAuditLogPage {
  items: AdminAuditLog[];
  nextCursor: string | null;
}

export interface AdminLowStockVariant {
  id: string;
  sku: string;
  weight: number;
  stock: number;
  currency: string;
  product: { name: string };
}

export interface AdminTopProduct {
  productId: string;
  _count: { productId: number };
  _sum: { quantity: number | null };
}

export interface AdminDashboard {
  revenue: {
    local: { total: string | null; currency: "LKR"; orders: number };
    international: { total: string | null; currency: "USD"; orders: number };
  };
  orders: { localCount: number; intlCount: number; pendingFulfilment: number };
  topProducts: AdminTopProduct[];
  lowStockVariants: AdminLowStockVariant[];
  recentAuditLogs: AdminAuditLog[];
}

export interface AdminOrderItem {
  quantity: number;
  unitPrice: string;
  product: { id: string; name: string; slug: string };
  variant: { id: string; weight: number; sku: string };
}

export interface AdminOrder {
  id: string;
  status: string;
  total: string;
  currency: "LKR" | "USD";
  market: "LOCAL" | "INTERNATIONAL";
  createdAt: string;
  trackingNumber: string | null;
  paymentIntentId?: string | null;
  user: { id: string; name: string; email: string } | null;
  items: AdminOrderItem[];
}

export interface AdminOrderEvent {
  status: string;
  note: string | null;
  createdAt: string;
}

export interface AdminOrderDetail extends AdminOrder {
  timeline: AdminOrderEvent[];
  coupon: { code: string } | null;
}

export interface AdminOrderPage {
  items: AdminOrder[];
  nextCursor: string | null;
}

export type BlogStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED";

export interface AdminBlogListItem {
  id: string;
  title: string;
  slug: string;
  status: BlogStatus;
  publishedAt: string | null;
  scheduledAt: string | null;
  viewCount: number;
  tags: string[];
}

export interface AdminBlogFull extends AdminBlogListItem {
  content: string;
  seoTitle: string | null;
  seoDesc: string | null;
}
