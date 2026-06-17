import type { Market, Spice, Order } from "./types";
import { paletteFor } from "./spice-data";

// Account / order-tracking data (ported from account-data.js), typed. The demo
// dataset powers the signed-in dashboard offline and as a fallback; live orders
// arrive from GET /orders when authed (toAccountOrder maps them onto this shape).

interface BaseSpice {
  name: string;
  latin: string;
  color: string;
  base: string;
  deep: string;
  surface: string;
  usd: number; // 100g base price
  lkr: number;
}

// small palette pulled from the catalogue (key → colour + base price)
export const ACCOUNT_SPICES: Record<string, BaseSpice> = {
  cinnamon: { name: "Ceylon Cinnamon Quills", latin: "Cinnamomum verum", color: "#B5651D", base: "#C2772E", deep: "#7E481A", surface: "#F3E7D4", usd: 14.5, lkr: 2150 },
  cardamom: { name: "Green Cardamom Pods", latin: "Elettaria cardamomum", color: "#7C9A5A", base: "#93AE6A", deep: "#566F37", surface: "#EAEFDD", usd: 18.0, lkr: 2680 },
  cloves: { name: "Whole Cloves", latin: "Syzygium aromaticum", color: "#6B4226", base: "#7A4A2A", deep: "#462914", surface: "#EBDDCD", usd: 11.25, lkr: 1670 },
  turmeric: { name: "Ground Turmeric", latin: "Curcuma longa", color: "#D99A1C", base: "#E2A62B", deep: "#A8740F", surface: "#F6E9C9", usd: 8.5, lkr: 1260 },
  pepper: { name: "Black Peppercorns", latin: "Piper nigrum", color: "#3C3A36", base: "#54504A", deep: "#26241F", surface: "#E6E2DA", usd: 9.9, lkr: 1470 },
  nutmeg: { name: "Whole Nutmeg", latin: "Myristica fragrans", color: "#A9683C", base: "#B57441", deep: "#7A451F", surface: "#F0E2D2", usd: 16.75, lkr: 2490 },
  curry: { name: "Ceylon Curry Powder", latin: "Roasted estate blend", color: "#9A5B22", base: "#AC6C2D", deep: "#6E3F16", surface: "#EFE2CE", usd: 13.75, lkr: 2040 },
};

const MULT: Record<string, number> = { "50g": 0.6, "100g": 1, "250g": 2.3 };

export interface OrderLineItem {
  key: string;
  name: string;
  latin: string;
  weight: string;
  form: string;
  qty: number;
  color: string;
  base: string;
  deep: string;
  surface: string;
  usd: number; // line unit price (base × mult)
  lkr: number;
}

function L(key: string, weight: string, form: string, qty: number): OrderLineItem {
  const s = ACCOUNT_SPICES[key];
  return {
    key, name: s.name, latin: s.latin, weight, form, qty,
    color: s.color, base: s.base, deep: s.deep, surface: s.surface,
    usd: s.usd * (MULT[weight] || 1), lkr: s.lkr * (MULT[weight] || 1),
  };
}

export interface OrderEvent { step: string; at: string; loc: string }
export interface AccountAddress {
  id: string;
  label: string;
  market: Market;
  name: string;
  lines: string[];
  cityzip?: string;
  country: string;
  phone: string;
  isDefault: boolean;
}
export interface AccountOrder {
  id: string;
  placedISO: string;
  placedLabel: string;
  status: string;
  carrier: string;
  tracking: string;
  etaLabel?: string;
  deliveredLabel?: string;
  shipTo: string;
  items: OrderLineItem[];
  events: OrderEvent[];
}
export interface AccountUser {
  first: string;
  name: string;
  initials: string;
  email: string;
  since: string;
  tier: string;
  points: number;
  pointsTo: number;
}
export interface AccountData {
  user: AccountUser;
  addresses: AccountAddress[];
  orders: AccountOrder[];
  wishlistKeys: string[];
}

// canonical fulfilment steps (the tracking spine)
export const AC_STEPS = [
  { key: "placed", label: "Order placed", note: "We received your order and payment." },
  { key: "packed", label: "Packed & sealed", note: "Fresh-milled and sealed at peak aroma within 24h." },
  { key: "shipped", label: "Dispatched", note: "Handed to the carrier from our Kandy facility." },
  { key: "transit", label: "In transit", note: "On the move toward your delivery address." },
  { key: "out", label: "Out for delivery", note: "With the courier for delivery today." },
  { key: "delivered", label: "Delivered", note: "Left at your door — enjoy the harvest." },
];
const STATUS_INDEX: Record<string, number> = { processing: 1, in_transit: 3, out_for_delivery: 4, delivered: 5 };

export const ACCOUNT: AccountData = {
  user: { first: "Amara", name: "Amara Wijesinghe", initials: "AW", email: "amara.w@example.com", since: "March 2024", tier: "Harvest Club · Gold", points: 1840, pointsTo: 2000 },
  addresses: [
    { id: "a1", label: "Home", market: "intl", name: "Amara Wijesinghe", lines: ["48 Marine Drive, Apt 9B", "Brooklyn, NY 11209"], country: "United States", phone: "+1 (917) 555 0142", isDefault: true },
    { id: "a2", label: "Office", market: "intl", name: "Amara Wijesinghe", lines: ["120 Hudson Street, Floor 5"], cityzip: "New York, NY 10013", country: "United States", phone: "+1 (212) 555 0190", isDefault: false },
    { id: "a3", label: "Colombo flat", market: "local", name: "Amara Wijesinghe", lines: ["22/4 Horton Place", "Colombo 07"], country: "Sri Lanka", phone: "+94 77 555 0142", isDefault: false },
  ],
  orders: [
    {
      id: "AC-820417", placedISO: "2026-05-29", placedLabel: "29 May 2026", status: "in_transit", carrier: "DHL Express", tracking: "JD0149220117", etaLabel: "2–3 Jun 2026", shipTo: "a1",
      items: [L("cinnamon", "250g", "Whole", 1), L("cardamom", "100g", "Whole", 1), L("turmeric", "100g", "Ground", 2)],
      events: [
        { step: "placed", at: "29 May, 9:24 AM", loc: "Online" },
        { step: "packed", at: "29 May, 6:10 PM", loc: "Kandy facility, LK" },
        { step: "shipped", at: "30 May, 8:02 AM", loc: "Colombo (CMB) hub, LK" },
        { step: "transit", at: "31 May, 4:48 PM", loc: "Dubai (DXB) transit, AE" },
      ],
    },
    {
      id: "AC-817905", placedISO: "2026-05-12", placedLabel: "12 May 2026", status: "delivered", carrier: "DHL Express", tracking: "JD0149118840", deliveredLabel: "17 May 2026", shipTo: "a1",
      items: [L("pepper", "100g", "Whole", 1), L("curry", "100g", "Ground", 1)],
      events: [
        { step: "placed", at: "12 May, 11:02 AM", loc: "Online" },
        { step: "packed", at: "12 May, 5:40 PM", loc: "Kandy facility, LK" },
        { step: "shipped", at: "13 May, 7:30 AM", loc: "Colombo (CMB) hub, LK" },
        { step: "transit", at: "15 May, 2:10 PM", loc: "Leipzig (LEJ) transit, DE" },
        { step: "out", at: "17 May, 8:15 AM", loc: "Brooklyn, NY" },
        { step: "delivered", at: "17 May, 1:46 PM", loc: "Front desk · signed AW" },
      ],
    },
    {
      id: "AC-811233", placedISO: "2026-04-02", placedLabel: "2 Apr 2026", status: "delivered", carrier: "DHL Express", tracking: "JD0148880021", deliveredLabel: "9 Apr 2026", shipTo: "a1",
      items: [L("cinnamon", "100g", "Whole", 2), L("cloves", "50g", "Whole", 1), L("nutmeg", "50g", "Whole", 1)],
      events: [
        { step: "placed", at: "2 Apr, 3:18 PM", loc: "Online" },
        { step: "delivered", at: "9 Apr, 11:20 AM", loc: "Front desk · signed AW" },
      ],
    },
  ],
  wishlistKeys: ["nutmeg", "cardamom", "cloves", "curry"],
};

// ---- helpers ----
export function acFmt(n: number, market: Market): string {
  if (market === "local") return "Rs " + Math.round(n).toLocaleString("en-US");
  return "$" + (Math.round(n * 100) / 100).toFixed(2);
}
export function acOrderSubtotal(o: AccountOrder, market: Market): number {
  return o.items.reduce((s, it) => s + (market === "local" ? it.lkr : it.usd) * it.qty, 0);
}
export function acOrderTotal(o: AccountOrder, market: Market): number {
  const sub = acOrderSubtotal(o, market);
  const ship = sub >= (market === "local" ? 5000 : 60) ? 0 : market === "local" ? 650 : 8.5;
  return sub + ship;
}
export interface StatusMeta { label: string; tone: "amber" | "forest" | "muted"; short: string }
export function acStatusMeta(status: string): StatusMeta {
  const map: Record<string, StatusMeta> = {
    processing: { label: "Processing", tone: "amber", short: "Processing" },
    in_transit: { label: "In transit", tone: "forest", short: "In transit" },
    out_for_delivery: { label: "Out for delivery", tone: "forest", short: "Out for delivery" },
    delivered: { label: "Delivered", tone: "muted", short: "Delivered" },
  };
  return map[status] || { label: status, tone: "muted", short: status };
}
export interface TimelineStep { key: string; label: string; note: string; state: "done" | "active" | "pending"; at: string | null; loc: string | null }
export function acBuildTimeline(order: AccountOrder, statusOverride?: string): TimelineStep[] {
  const status = statusOverride || order.status;
  const curIdx = STATUS_INDEX[status];
  const byStep: Record<string, OrderEvent> = {};
  (order.events || []).forEach((e) => (byStep[e.step] = e));
  return AC_STEPS.map((st, i) => {
    const ev = byStep[st.key];
    let state: TimelineStep["state"] = i < curIdx ? "done" : i === curIdx ? "active" : "pending";
    if (status === "delivered" && i <= curIdx) state = "done";
    return { key: st.key, label: st.label, note: st.note, state, at: ev ? ev.at : null, loc: ev ? ev.loc : null };
  });
}

// Build a Spice (card view-model) from a wishlist/reorder key.
export function spiceForKey(key: string): Spice | null {
  const s = ACCOUNT_SPICES[key];
  if (!s) return null;
  return {
    slug: key,
    name: s.name, latin: s.latin, origin: "Sri Lanka",
    color: s.color, base: s.base, deep: s.deep, surface: s.surface,
    rating: 4.8, reviews: 120, badge: "In Stock",
    usd: "$" + s.usd.toFixed(2), lkr: "Rs " + s.lkr.toLocaleString("en-US"),
    weights: ["50g", "100g", "250g"],
  };
}
export function wishlistSpices(keys: string[]): Spice[] {
  return keys.map(spiceForKey).filter((s): s is Spice => !!s);
}

// Map backend status strings → the dashboard's lowercase status tokens.
const BACKEND_STATUS_MAP: Record<string, string> = {
  PENDING: "processing",
  PAID: "processing",
  PROCESSING: "processing",
  SHIPPED: "in_transit",
  DELIVERED: "delivered",
  CANCELLED: "delivered",
  REFUNDED: "delivered",
};

// Convert a backend Order → AccountOrder so the existing dashboard components
// can render it unchanged. Colors are derived by hashing the product slug.
export function toAccountOrder(order: Order): AccountOrder {
  const status = BACKEND_STATUS_MAP[order.status] ?? "processing";
  const placed = new Date(order.createdAt);
  const placedLabel = placed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const items: OrderLineItem[] = order.items.map((it, idx) => {
    const slug = it.product?.slug ?? `product-${idx}`;
    const pal = paletteFor(slug);
    const unitPriceNum = parseFloat(it.unitPrice || "0");
    const weightGrams = it.variant?.weight ?? 100;
    const weightStr = weightGrams < 100 ? "50g" : weightGrams > 100 ? "250g" : "100g";
    return {
      key: `${order.id}-${idx}`,
      name: it.product?.name ?? "Spice",
      latin: "",
      weight: weightStr,
      form: "Whole",
      qty: it.quantity,
      color: pal.color,
      base: pal.base,
      deep: pal.deep,
      surface: pal.surface,
      usd: order.currency === "USD" ? unitPriceNum : unitPriceNum / 148,
      lkr: order.currency === "LKR" ? unitPriceNum : unitPriceNum * 148,
    };
  });

  const timeline = (order.timeline ?? []).map((t) => ({
    step: BACKEND_STATUS_MAP[t.status] ?? "placed",
    at: new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
    loc: t.note ?? "",
  }));

  return {
    id: `AC-${order.id.slice(-6).toUpperCase()}`,
    placedISO: placed.toISOString().slice(0, 10),
    placedLabel,
    status,
    carrier: "DHL Express",
    tracking: order.trackingNumber ?? "",
    etaLabel: undefined,
    deliveredLabel: status === "delivered" ? placedLabel : undefined,
    shipTo: "",
    items,
    events: timeline,
  };
}
