import { SPICES } from "./spice-data";
import { JOURNAL } from "./journal-data";
import type { Spice } from "./types";

// Aranya Ceylon — ADMIN sample dataset (ported verbatim from admin-data.js).
// Fabricated back-office data for the admin console. Reuses the demo SPICES and
// JOURNAL sets so the numbers stay consistent with the storefront. Deterministic
// (seeded RNG) so the dashboard renders identically on every load / on the
// server and client. With a live backend these shapes are replaced by the typed
// admin API client (lib/api/admin.ts); this is the offline / demo fallback.

export type AdminMarket = "intl" | "local";

export interface DayPoint {
  date: Date;
  label: string;
  dow: number;
  revUsd: number;
  orders: number;
  intl: number;
}
export interface OrderItem {
  name: string;
  weight: string;
  qty: number;
  priceUsd: number;
  color: string;
}
export interface AdminOrder {
  id: string;
  market: AdminMarket;
  status: string;
  customer: string;
  email: string;
  city: string;
  country: string;
  date: Date;
  items: OrderItem[];
  units: number;
  subUsd: number;
  shipUsd: number;
  discountUsd?: number;
  totalUsd: number;
  payment: string;
  fulfillment: string;
  coupon: string | null;
  tracking: string | null;
  timeline?: Array<{ status: string; note: string; date: Date }>;
}
export interface TopProduct {
  name: string;
  units: number;
  revUsd: number;
  share: number;
  trend: number[];
  color: string;
}
export interface MarketSeg {
  key: string;
  label: string;
  value: number;
  color: string;
}
export interface LowStockItem {
  name: string;
  sku: string;
  weight: string;
  stock: number;
  threshold: number;
  color: string;
}
export interface WholesaleApp {
  id: string;
  company: string;
  contact: string;
  country: string;
  type: string;
  date: string;
  status: string;
  volume: string;
}
export interface AdminProduct {
  name: string;
  latin: string;
  flavour: string[];
  slug: string;
  sku: string;
  category: string;
  color: string;
  base: string;
  deep: string;
  surface: string;
  usd: string;
  lkr: string;
  weights: string[];
  rating: number;
  reviews: number;
  badge: string;
  stock: number;
  status: string;
  sold30: number;
  visible: boolean;
  featured: boolean;
}
export interface AdminBlogPost {
  slug: string;
  title: string;
  category: string;
  author: string;
  role: string;
  date: string;
  readTime: string;
  accent: string;
  featured: boolean;
  status: string;
  views: number;
  scheduledFor?: string;
}
export interface AuditRow {
  ts: string;
  createdAt?: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  meta: string;
  level: string;
}
export interface ActivityItem {
  icon: string;
  tone: string;
  text: string;
  who: string;
  when: string;
}
export interface AdminUser {
  name: string;
  role: string;
  access: string;
  initials: string;
}

export interface AdminData {
  fmt: { usd: (n: number) => string; lkr: (n: number) => string };
  days: DayPoint[];
  todayRow: DayPoint;
  ydayRow: DayPoint;
  KPIS: {
    todayRevUsd: number;
    todayOrders: number;
    revChange: number;
    ordChange: number;
    aov: number;
    aovChange: number;
    pendingFulfillment: number;
    pendingChange: number;
    last30Rev: number;
    last30Ord: number;
    conversion: number;
    convChange: number;
    visitors7: number;
    refundRate: number;
    newCustomers: number;
    returningRate: number;
  };
  MARKET_SPLIT: MarketSeg[];
  TOP_PRODUCTS: TopProduct[];
  ORDERS: AdminOrder[];
  LOW_STOCK: LowStockItem[];
  WHOLESALE: WholesaleApp[];
  PRODUCTS: AdminProduct[];
  CATEGORIES: { name: string; count: number }[];
  BLOG: AdminBlogPost[];
  AUDIT: AuditRow[];
  ACTIVITY: ActivityItem[];
  user: AdminUser;
}

function build(): AdminData {
  const S: Spice[] = SPICES;
  const usd = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const lkr = (n: number) => "Rs " + Math.round(n).toLocaleString("en-US");

  /* ---------- 30-day revenue series (USD-normalised totals) ---------- */
  const days: DayPoint[] = [];
  const today = new Date("2026-06-04T00:00:00");
  let seed = 42;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dow = d.getDay();
    const weekend = dow === 0 || dow === 6 ? 1.18 : 1;
    const trend = 1 + (29 - i) * 0.011;
    const base = 1850 * trend * weekend * (0.82 + rnd() * 0.4);
    const orders = Math.round(base / (62 + rnd() * 18));
    days.push({
      date: d,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      dow,
      revUsd: Math.round(base),
      orders,
      intl: Math.round(base * (0.58 + rnd() * 0.08)),
    });
  }
  const todayRow = days[days.length - 1];
  const ydayRow = days[days.length - 2];
  const sum = (arr: DayPoint[], k: keyof DayPoint) => arr.reduce((a, r) => a + (r[k] as number), 0);
  const last30Rev = sum(days, "revUsd");
  const last30Ord = sum(days, "orders");

  /* ---------- KPI tiles ---------- */
  const KPIS = {
    todayRevUsd: todayRow.revUsd,
    todayOrders: todayRow.orders,
    revChange: 8.4,
    ordChange: 5.2,
    aov: last30Rev / last30Ord,
    aovChange: 4.2,
    pendingFulfillment: 18,
    pendingChange: 3,
    last30Rev,
    last30Ord,
    conversion: 3.4,
    convChange: 0.3,
    visitors7: 14820,
    refundRate: 1.2,
    newCustomers: 64,
    returningRate: 38,
  };

  /* ---------- market split (last 30d) ---------- */
  const intl30 = sum(days, "intl");
  const MARKET_SPLIT: MarketSeg[] = [
    { key: "intl", label: "International · USD", value: intl30, color: "#BA7517" },
    { key: "local", label: "Sri Lanka · LKR", value: last30Rev - intl30, color: "#0F6E56" },
  ];

  /* ---------- top products (last 30d) ---------- */
  const TOP_PRODUCTS: TopProduct[] = [
    { name: "Ceylon Cinnamon", units: 1284, revUsd: 18618, share: 22, trend: [8, 9, 11, 10, 13, 14, 16], color: (S[0] && S[0].color) || "#B5651D" },
    { name: "Ground Turmeric", units: 1106, revUsd: 9401, share: 17, trend: [6, 7, 7, 9, 10, 11, 12], color: "#D99A1C" },
    { name: "Black Peppercorns", units: 942, revUsd: 9325, share: 14, trend: [9, 8, 9, 8, 10, 9, 11], color: "#54504A" },
    { name: "Green Cardamom", units: 731, revUsd: 13158, share: 13, trend: [5, 6, 6, 7, 6, 8, 9], color: "#7C9A5A" },
    { name: "Whole Cloves", units: 588, revUsd: 6615, share: 9, trend: [4, 5, 5, 4, 6, 6, 7], color: "#7A4A2A" },
    { name: "Whole Nutmeg", units: 412, revUsd: 6901, share: 7, trend: [3, 3, 4, 4, 3, 5, 5], color: "#B57441" },
  ];

  /* ---------- orders ---------- */
  const FIRST = ["Amara", "Priya", "James", "Sanjana", "Oliver", "Mei", "Tharindu", "Sofia", "Liam", "Nadia", "Marcus", "Yuki", "Ishani", "Daniel", "Fatima", "Ravi", "Elena", "Kasun", "Grace", "Noah", "Dilani", "Hassan", "Chloe", "Arjun"];
  const LAST = ["Fernando", "Sharma", "Whitcombe", "Perera", "Bauer", "Tanaka", "Silva", "Rossi", "O'Connor", "Haddad", "Lind", "Mori", "Bandara", "Cole", "Aziz", "Mendis", "Petrova", "Jayasuriya", "Okafor", "Berg"];
  const CITY_INTL: [string, string][] = [["London", "GB"], ["New York", "US"], ["Berlin", "DE"], ["Toronto", "CA"], ["Sydney", "AU"], ["Singapore", "SG"], ["Dubai", "AE"], ["Paris", "FR"], ["Amsterdam", "NL"], ["Tokyo", "JP"]];
  const CITY_LK: [string, string][] = [["Colombo", "LK"], ["Kandy", "LK"], ["Galle", "LK"], ["Negombo", "LK"], ["Jaffna", "LK"]];
  const PAY: Record<AdminMarket, string> = { intl: "Stripe", local: "PayHere" };

  function mkItems(n: number) {
    const items: OrderItem[] = [];
    const used = new Set<number>();
    let units = 0;
    let sub = 0;
    for (let i = 0; i < n; i++) {
      let pi = Math.floor(rnd() * S.length);
      while (used.has(pi) && used.size < S.length) pi = Math.floor(rnd() * S.length);
      used.add(pi);
      const sp = S[pi] || S[0];
      const qty = 1 + Math.floor(rnd() * 3);
      const w = (sp.weights || ["100g"])[Math.floor(rnd() * (sp.weights ? sp.weights.length : 1))];
      const priceUsd = parseFloat((sp.usd || "$12").replace(/[^0-9.]/g, ""));
      units += qty;
      sub += priceUsd * qty;
      items.push({ name: sp.name, weight: w, qty, priceUsd, color: sp.color });
    }
    return { items, units, sub };
  }

  const ORDERS: AdminOrder[] = [];
  let onum = 4821;
  for (let i = 0; i < 46; i++) {
    const market: AdminMarket = rnd() < 0.62 ? "intl" : "local";
    const nItems = 1 + Math.floor(rnd() * 4);
    const { items, units, sub } = mkItems(nItems);
    const shipUsd = market === "intl" ? (sub > 60 ? 0 : 9.5) : sub > 25 ? 0 : 2.2;
    const totalUsd = sub + shipUsd;
    const ageDays = Math.floor(rnd() * 26);
    let status: string;
    if (ageDays <= 1) status = rnd() < 0.6 ? "paid" : "processing";
    else if (ageDays <= 4) status = rnd() < 0.5 ? "processing" : "shipped";
    else if (ageDays <= 12) status = rnd() < 0.7 ? "shipped" : "delivered";
    else status = rnd() < 0.85 ? "delivered" : rnd() < 0.5 ? "refunded" : "cancelled";
    const d = new Date(today);
    d.setDate(today.getDate() - ageDays);
    d.setHours(8 + Math.floor(rnd() * 11), Math.floor(rnd() * 60));
    const fn = FIRST[Math.floor(rnd() * FIRST.length)];
    const ln = LAST[Math.floor(rnd() * LAST.length)];
    const city = market === "intl" ? CITY_INTL[Math.floor(rnd() * CITY_INTL.length)] : CITY_LK[Math.floor(rnd() * CITY_LK.length)];
    const id = "AC-" + onum++;
    ORDERS.push({
      id,
      market,
      status,
      customer: fn + " " + ln,
      email: (fn + "." + ln).toLowerCase().replace(/[^a-z.]/g, "") + "@" + ["gmail.com", "outlook.com", "proton.me", "icloud.com"][Math.floor(rnd() * 4)],
      city: city[0],
      country: city[1],
      date: d,
      items,
      units,
      subUsd: sub,
      shipUsd,
      totalUsd,
      payment: PAY[market],
      fulfillment: status === "paid" || status === "processing" ? "Unfulfilled" : status === "shipped" ? "In transit" : status === "delivered" ? "Fulfilled" : "—",
      coupon: rnd() < 0.2 ? ["HARVEST10", "WELCOME", "CEYLON15"][Math.floor(rnd() * 3)] : null,
      tracking: status === "shipped" || status === "delivered" ? "LK" + Math.floor(100000000 + rnd() * 800000000) + "CE" : null,
    });
  }
  ORDERS.sort((a, b) => b.date.getTime() - a.date.getTime());

  /* ---------- low stock ---------- */
  const LOW_STOCK: LowStockItem[] = [
    { name: "Green Cardamom", sku: "AC-CARD-100", weight: "100g", stock: 7, threshold: 25, color: "#7C9A5A" },
    { name: "Whole Nutmeg", sku: "AC-NUT-050", weight: "50g", stock: 12, threshold: 30, color: "#B57441" },
    { name: "Ceylon Cinnamon", sku: "AC-CIN-250", weight: "250g", stock: 4, threshold: 20, color: "#B5651D" },
    { name: "Whole Cloves", sku: "AC-CLV-100", weight: "100g", stock: 16, threshold: 30, color: "#7A4A2A" },
  ];

  /* ---------- wholesale applications ---------- */
  const WHOLESALE: WholesaleApp[] = [
    { id: "WS-208", company: "Maison Épice", contact: "Camille Roux", country: "FR", type: "Restaurant group", date: "Jun 3", status: "pending", volume: "$4,000/mo" },
    { id: "WS-207", company: "Cardamom & Co.", contact: "Priya Anand", country: "GB", type: "Specialty retailer", date: "Jun 2", status: "pending", volume: "$2,500/mo" },
    { id: "WS-206", company: "Northwind Roasters", contact: "Erik Lund", country: "SE", type: "Café chain", date: "Jun 1", status: "review", volume: "$1,800/mo" },
    { id: "WS-205", company: "Lotus Pantry", contact: "Mei Tan", country: "SG", type: "Online grocer", date: "May 30", status: "approved", volume: "$6,200/mo" },
    { id: "WS-204", company: "Galle Fort Hotel", contact: "Ruwan De Silva", country: "LK", type: "Hospitality", date: "May 29", status: "approved", volume: "Rs 320k/mo" },
  ];

  /* ---------- products (admin table) ---------- */
  const stockArr = [4, 7, 240, 12, 410, 188];
  const PRODUCTS: AdminProduct[] = S.map((sp, i) => {
    const stockEach = stockArr[i] != null ? stockArr[i] : 120;
    const cat = /Turmeric|Cardamom/.test(sp.name) ? "Ground & Powders" : /Cinnamon|Cloves|Nutmeg|Pepper/.test(sp.name) ? "Whole Spices" : "Whole Spices";
    return {
      name: sp.name,
      latin: sp.latin,
      flavour: [],
      slug: sp.name.toLowerCase().replace(/\s+/g, "-"),
      sku: "AC-" + sp.name.split(" ").map((w) => w[0]).join("").toUpperCase(),
      category: cat,
      color: sp.color,
      base: sp.base,
      deep: sp.deep,
      surface: sp.surface,
      usd: sp.usd,
      lkr: sp.lkr,
      weights: sp.weights,
      rating: sp.rating,
      reviews: sp.reviews,
      badge: sp.badge,
      stock: stockEach,
      status: stockEach === 0 ? "Out of stock" : stockEach < 20 ? "Low stock" : "Active",
      sold30: TOP_PRODUCTS[i] ? TOP_PRODUCTS[i].units : 200 + i * 30,
      visible: true,
      featured: i < 2,
    };
  });
  PRODUCTS.push({
    name: "Hill Country Gift Box", latin: "Curated set of five", flavour: [], slug: "hill-country-gift-box",
    sku: "AC-GIFT-01", category: "Gift Sets", color: "#9A6A3C", base: "#B57441", deep: "#7A451F", surface: "#F0E2D2",
    usd: "$58.00", lkr: "Rs 8,600", weights: ["Set of 5"], rating: 5.0, reviews: 64, badge: "New",
    stock: 36, status: "Active", sold30: 142, visible: true, featured: true,
  });
  PRODUCTS.push({
    name: "Ceylon Curry Kit", latin: "Roast-and-grind blend set", flavour: [], slug: "ceylon-curry-kit",
    sku: "AC-KIT-01", category: "Gift Sets", color: "#7A4A2A", base: "#8A5A34", deep: "#4A2A14", surface: "#EBDDCD",
    usd: "$34.00", lkr: "Rs 5,050", weights: ["Kit"], rating: 4.9, reviews: 38, badge: "New",
    stock: 0, status: "Out of stock", sold30: 88, visible: true, featured: false,
  });

  const CATEGORIES = [
    { name: "Whole Spices", count: 4 },
    { name: "Ground & Powders", count: 2 },
    { name: "Gift Sets", count: 2 },
  ];

  /* ---------- blog posts (admin table) ---------- */
  const viewsArr = [4820, 3110, 5640, 2280, 1890, 3470, 2050];
  const BLOG: AdminBlogPost[] = JOURNAL.map((p, i) => ({
    slug: p.slug,
    title: p.title,
    category: p.category,
    author: p.author,
    role: p.role,
    date: p.date,
    readTime: p.readTime,
    accent: p.accent,
    featured: p.featured,
    status: i < 5 ? "Published" : "Draft",
    views: viewsArr[i] || 900,
  }));
  BLOG.unshift({
    slug: "monsoon-harvest", title: "What the monsoon does to a cinnamon harvest",
    category: "Sourcing", author: "Devika R.", role: "Head of Sourcing",
    date: "Jun 9, 2026", readTime: "6 min", accent: "#1D9E75", featured: false,
    status: "Scheduled", scheduledFor: "Jun 9, 2026 · 09:00", views: 0,
  });

  /* ---------- audit log ---------- */
  const AUDIT: AuditRow[] = [
    { ts: "Jun 4, 09:42", actor: "Devika R.", role: "ADMIN", action: "order.refund", target: "Order AC-4806", meta: "Refunded $42.50 via Stripe", level: "warn" },
    { ts: "Jun 4, 09:18", actor: "System", role: "JOB", action: "stock.alert", target: "Ceylon Cinnamon 250g", meta: "Stock 4 below threshold 20", level: "warn" },
    { ts: "Jun 4, 08:55", actor: "Devika R.", role: "ADMIN", action: "order.status", target: "Order AC-4817", meta: "processing → shipped", level: "info" },
    { ts: "Jun 4, 08:30", actor: "Marcus L.", role: "ADMIN", action: "product.update", target: "Green Cardamom", meta: "Price 17.50 → 18.00 USD", level: "info" },
    { ts: "Jun 3, 17:12", actor: "Priya A.", role: "SUPERADMIN", action: "wholesale.approve", target: "WS-205 · Lotus Pantry", meta: "Status pending → approved", level: "info" },
    { ts: "Jun 3, 16:40", actor: "System", role: "JOB", action: "blog.publish", target: "Golden milk, done properly", meta: "Scheduled post published", level: "info" },
    { ts: "Jun 3, 15:05", actor: "Marcus L.", role: "ADMIN", action: "product.create", target: "Ceylon Curry Kit", meta: "New product created", level: "info" },
    { ts: "Jun 3, 11:48", actor: "Devika R.", role: "ADMIN", action: "auth.login", target: "Admin console", meta: "Login from Colombo · 203.0.113.7", level: "info" },
    { ts: "Jun 3, 10:22", actor: "Marcus L.", role: "ADMIN", action: "product.images", target: "Hill Country Gift Box", meta: "Uploaded 4 images", level: "info" },
    { ts: "Jun 2, 18:30", actor: "Priya A.", role: "SUPERADMIN", action: "order.refund", target: "Order AC-4791", meta: "Refunded Rs 3,140 via PayHere", level: "warn" },
    { ts: "Jun 2, 14:11", actor: "Devika R.", role: "ADMIN", action: "blog.schedule", target: "What the monsoon does…", meta: "Scheduled for Jun 9 09:00", level: "info" },
    { ts: "Jun 2, 09:03", actor: "System", role: "JOB", action: "cart.expire", target: "12 guest carts", meta: "Expired after 7 days", level: "muted" },
  ];

  /* ---------- recent activity feed (dashboard) ---------- */
  const ACTIVITY: ActivityItem[] = [
    { icon: "bag", tone: "brand", text: "New order **AC-4821** · $48.50", who: "Amara Fernando · London", when: "2m ago" },
    { icon: "alert", tone: "red", text: "**Ceylon Cinnamon 250g** dropped to 4 in stock", who: "Inventory", when: "18m ago" },
    { icon: "handshake", tone: "amber", text: "Wholesale application from **Maison Épice**", who: "France · $4,000/mo", when: "1h ago" },
    { icon: "truck", tone: "slate", text: "Order **AC-4817** marked shipped", who: "Devika R.", when: "1h ago" },
    { icon: "refund", tone: "red", text: "Refund issued on **AC-4806** · $42.50", who: "Devika R.", when: "2h ago" },
    { icon: "user", tone: "brand", text: "**8 new customers** joined the Harvest Club", who: "Today", when: "3h ago" },
  ];

  return {
    fmt: { usd, lkr },
    days, todayRow, ydayRow,
    KPIS, MARKET_SPLIT, TOP_PRODUCTS,
    ORDERS, LOW_STOCK, WHOLESALE,
    PRODUCTS, CATEGORIES, BLOG, AUDIT, ACTIVITY,
    user: { name: "Devika R.", role: "Head of Sourcing", access: "ADMIN", initials: "DR" },
  };
}

// Built once at module load (deterministic), mirroring the prototype's window.ADMIN.
export const ADMIN: AdminData = build();
