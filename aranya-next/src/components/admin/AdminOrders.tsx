"use client";

import * as React from "react";
import { ADMIN, type AdminOrder, type AdminMarket } from "@/lib/admin-data";
import { AIcon, Pill, MarketTag, Avatar } from "./AdminPrimitives";
import { updateOrderStatus, refundOrder, listAdminOrders, getAdminOrder } from "@/lib/api/admin";
import { exportCsv } from "@/lib/csv";
import { LKR_PER_USD } from "@/lib/fx";
import { DEMO_MODE } from "@/lib/demo";
import type { Order } from "@/lib/types";
import { formatOrderNumber } from "@/lib/order-number";

function backendOrderToAdmin(order: Order): AdminOrder {
  const currency = order.currency ?? "USD";
  const total = parseFloat(String(order.total ?? "0"));
  const shipping = parseFloat(String(order.shippingCost ?? "0"));
  const discount = parseFloat(String(order.discount ?? "0"));
  const subtotal = total - shipping + discount;
  const toUsd = (amount: number) => currency === "USD" ? amount : amount / LKR_PER_USD;
  const totalUsd = currency === "USD" ? total : total / LKR_PER_USD;
  const itemsList = order.items ?? [];
  const address = order.shippingAddress ?? {};
  return {
    id: order.id,
    market: (order.market === "LOCAL" ? "local" : "intl") as AdminMarket,
    status: (order.status ?? "paid").toLowerCase(),
    customer: order.user?.name ?? "Guest",
    email: order.user?.email ?? order.guestEmail ?? "",
    city: String(address.city ?? "—"),
    country: String(address.country ?? "—"),
    date: new Date(order.createdAt),
    items: itemsList.map((it) => ({
      name: it.product?.name ?? "Spice",
      weight: it.variant?.weight ? `${it.variant.weight}g` : "100g",
      qty: it.quantity,
      priceUsd: currency === "USD" ? parseFloat(String(it.unitPrice ?? "0")) : parseFloat(String(it.unitPrice ?? "0")) / LKR_PER_USD,
      color: "#B5651D",
    })),
    units: itemsList.reduce((s, it) => s + it.quantity, 0),
    subUsd: toUsd(subtotal),
    shipUsd: toUsd(shipping),
    discountUsd: toUsd(discount),
    totalUsd,
    payment: order.market === "LOCAL" ? "PayHere" : "Stripe",
    fulfillment: order.status === "SHIPPED" || order.status === "DELIVERED" ? "Fulfilled" : "Unfulfilled",
    coupon: order.coupon?.code ?? null,
    tracking: order.trackingNumber ?? null,
    timeline: order.timeline?.map((event) => ({ status: event.status, note: event.note ?? `Status changed to ${event.status}`, date: new Date(event.createdAt) })),
  };
}

// Aranya Ceylon — ADMIN Orders (ported from admin-orders.jsx).
// Filterable list + detail drawer (status flow, refund). Status writes are
// optimistic local-state mutations, best-effort synced to /admin/orders.

const orFmtUSD = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const orDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const orTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const ORDER_TABS = [
  { key: "all", label: "All orders" },
  { key: "paid", label: "Paid" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "refunded", label: "Refunded" },
];

function OrdersToolbar({ tab, setTab, market, setMarket, q, setQ, counts }: {
  tab: string; setTab: (t: string) => void; market: string; setMarket: (m: string) => void;
  q: string; setQ: (q: string) => void; counts: Record<string, number>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div className="ad-seg" style={{ flexWrap: "wrap" }}>
          {ORDER_TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
              {t.label}{counts[t.key] != null && <span style={{ marginLeft: 6, opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>{counts[t.key]}</span>}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div className="ad-search" style={{ width: 230 }}>
            <AIcon name="search" size={15} stroke="var(--ad-faint)" />
            <input placeholder="Search orders…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="ad-seg">
            {["all", "intl", "local"].map((m) => <button key={m} className={market === m ? "on" : ""} onClick={() => setMarket(m)}>{m === "all" ? "All markets" : m === "intl" ? "USD" : "LKR"}</button>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrdersTable({ orders, onOpen }: { orders: AdminOrder[]; onOpen: (o: AdminOrder) => void }) {
  return (
    <div className="ad-card" style={{ overflow: "hidden" }}>
      <table className="ad-table">
        <thead>
          <tr>
            <th>Order</th><th>Customer</th><th>Date</th><th>Market</th><th>Items</th>
            <th className="num">Total</th><th>Payment</th><th>Fulfillment</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} onClick={() => onOpen(o)}>
              <td style={{ fontWeight: 700 }}>{formatOrderNumber(o.id)}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={o.customer} />
                  <div style={{ lineHeight: 1.3 }}>
                    <div style={{ fontWeight: 600 }}>{o.customer}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ad-faint)" }}>{o.city}, {o.country}</div>
                  </div>
                </div>
              </td>
              <td style={{ color: "var(--ad-muted)", whiteSpace: "nowrap" }}>{orDate(o.date)}</td>
              <td><MarketTag market={o.market} /></td>
              <td className="tnum" style={{ color: "var(--ad-muted)" }}>{o.units}</td>
              <td className="num" style={{ fontWeight: 700 }}>{orFmtUSD(o.totalUsd)}</td>
              <td style={{ color: "var(--ad-muted)", fontSize: 12.5 }}>{o.payment}</td>
              <td style={{ fontSize: 12.5, color: "var(--ad-muted)" }}>{o.fulfillment}</td>
              <td><Pill status={o.status} /></td>
              <td style={{ textAlign: "right" }}><AIcon name="chevronR" size={16} stroke="var(--ad-faint)" /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--ad-faint)", fontSize: 14 }}>No orders match these filters.</div>}
    </div>
  );
}

const STATUS_FLOW = ["paid", "processing", "shipped", "delivered"];

function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ad-muted)" }}><span>{k}</span><span className="tnum" style={{ color: "var(--ad-ink)", fontWeight: 600 }}>{v}</span></div>;
}
function InfoBlock({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="ad-card" style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <AIcon name={icon} size={14} stroke="var(--ad-faint)" /><span className="ad-label">{title}</span>
      </div>
      {children}
    </div>
  );
}

function OrderDrawer({ order, onClose, onStatus, onRefund }: {
  order: AdminOrder; onClose: () => void; onStatus: (o: AdminOrder, s: string, trackingNumber?: string) => void; onRefund: (o: AdminOrder, manualGatewayRefundCompleted: boolean) => void;
}) {
  const [confirmRefund, setConfirmRefund] = React.useState(false);
  const [trackingNumber, setTrackingNumber] = React.useState(order.tracking ?? "");
  const [manualRefundDone, setManualRefundDone] = React.useState(false);
  React.useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const o = order;
  const refunded = o.status === "refunded";
  const cancelled = o.status === "cancelled";
  const stepIdx = STATUS_FLOW.indexOf(o.status);
  const ship = o.market === "intl" ? orFmtUSD(o.shipUsd) : o.shipUsd === 0 ? "Free" : orFmtUSD(o.shipUsd);

  const tl = o.timeline?.length
    ? o.timeline.map((event) => ({ t: event.status.toLowerCase().replace(/^./, (c) => c.toUpperCase()), d: event.date, meta: event.note, warn: ["REFUNDED", "CANCELLED"].includes(event.status) }))
    : [{ t: "Order placed", d: o.date, meta: `${o.payment} · ${o.market === "intl" ? "USD" : "LKR"}`, warn: false }];

  return (
    <>
      <div className="ad-scrim" onClick={onClose} />
      <aside className="ad-drawer">
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--ad-line)", display: "flex", alignItems: "flex-start", gap: 14, background: "var(--ad-card)" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 className="disp" style={{ fontSize: 27, color: "var(--ad-ink)" }}>{formatOrderNumber(o.id)}</h2>
              <Pill status={o.status} />
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ad-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>{orDate(o.date)} at {orTime(o.date)} · <MarketTag market={o.market} /></div>
          </div>
          <button className="ad-iconbtn" onClick={onClose}><AIcon name="x" size={17} stroke="var(--ad-muted)" /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          {!refunded && !cancelled && (
            <div className="ad-card" style={{ padding: 16 }}>
              <div className="ad-label" style={{ marginBottom: 10 }}>Update status</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {STATUS_FLOW.map((s, i) => {
                  const active = s === o.status, passed = i < stepIdx;
                  // PAID is set by the payment gateway/webhook, never by an admin —
                  // the backend enum rejects it, so it's a display marker, not a
                  // clickable transition (FLOW-02).
                  const clickable = s !== "paid" && (s !== "shipped" || !!trackingNumber.trim());
                  return (
                    <button key={s} onClick={clickable ? () => onStatus(o, s, s === "shipped" ? trackingNumber.trim() : undefined) : undefined} disabled={!clickable} className="ad-btn ad-btn-sm"
                      style={{ background: active ? "var(--brand)" : passed ? "rgba(15,110,86,.1)" : "#fff", color: active ? "#fff" : passed ? "var(--pos-deep)" : "var(--ad-muted)", border: active ? "0" : "1px solid var(--ad-line-2)", textTransform: "capitalize", cursor: clickable ? "pointer" : "default" }}>
                      {passed && <AIcon name="check" size={13} stroke="var(--pos-deep)" w={2.4} />}{s}
                    </button>
                  );
                })}
              </div>
              {(o.status === "processing" || o.status === "shipped") && (
                <div className="ad-field" style={{ marginTop: 12 }}>
                  <label className="ad-label">Tracking number {o.status === "processing" && "(required to ship)"}</label>
                  <input className="ad-input" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Courier tracking number" />
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button className="ad-btn ad-btn-green ad-btn-sm" disabled={o.status === "delivered" || (o.status === "processing" && !trackingNumber.trim())} style={{ flex: 1, justifyContent: "center" }} onClick={() => {
                  const next = o.status === "paid" ? "processing" : o.status === "processing" ? "shipped" : "delivered";
                  onStatus(o, next, next === "shipped" ? trackingNumber.trim() : undefined);
                }}>
                  <AIcon name="truck" size={15} stroke="#fff" />{o.status === "paid" ? "Start processing" : o.status === "processing" ? "Mark as shipped" : o.status === "shipped" ? "Mark delivered" : "Fulfilled"}
                </button>
                <button className="ad-btn ad-btn-ghost ad-btn-sm"><AIcon name="download" size={15} stroke="var(--ad-muted)" />Packing slip</button>
              </div>
            </div>
          )}

          <div>
            <div className="ad-label" style={{ marginBottom: 12 }}>Timeline</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {tl.slice().reverse().map((s, i, arr) => (
                <div key={i} style={{ display: "flex", gap: 13 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ width: 13, height: 13, borderRadius: 999, background: s.warn ? "var(--neg)" : i === 0 ? "var(--brand)" : "#fff", border: s.warn || i === 0 ? "0" : "2px solid var(--brand)", marginTop: 2 }} />
                    {i < arr.length - 1 && <span style={{ width: 2, flex: 1, background: "var(--ad-line-2)", margin: "3px 0" }} />}
                  </div>
                  <div style={{ paddingBottom: i < arr.length - 1 ? 18 : 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: s.warn ? "var(--neg)" : "var(--ad-ink)" }}>{s.t}</div>
                    <div style={{ fontSize: 12, color: "var(--ad-faint)", marginTop: 1 }}>{orDate(s.d)} · {s.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ad-card" style={{ overflow: "hidden" }}>
            <div className="ad-card-h"><div className="ad-card-t">{o.units} item{o.units !== 1 ? "s" : ""}</div></div>
            <div style={{ padding: "6px 16px 12px" }}>
              {o.items.map((it, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < o.items.length - 1 ? "1px solid var(--ad-line)" : 0 }}>
                  <span className="swatch" style={{ width: 38, height: 38, background: `radial-gradient(70% 70% at 50% 35%, ${it.color}, ${it.color}bb)` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{it.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ad-faint)" }}>{it.weight} · {orFmtUSD(it.priceUsd)} each</div>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ad-muted)" }}>×{it.qty}</div>
                  <div className="tnum" style={{ fontSize: 13.5, fontWeight: 700, width: 64, textAlign: "right" }}>{orFmtUSD(it.priceUsd * it.qty)}</div>
                </div>
              ))}
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7, fontSize: 13 }}>
                <Row k="Subtotal" v={orFmtUSD(o.subUsd)} />
                {(o.discountUsd ?? 0) > 0 && <Row k={<span>Discount {o.coupon && <span className="pill approved" style={{ textTransform: "none", marginLeft: 4 }}>{o.coupon}</span>}</span>} v={"–" + orFmtUSD(o.discountUsd ?? 0)} />}
                <Row k="Shipping" v={ship} />
                <div style={{ height: 1, background: "var(--ad-line)", margin: "5px 0" }} />
                <Row k={<b style={{ fontWeight: 800 }}>Total</b>} v={<b className="tnum" style={{ fontWeight: 800, fontSize: 15 }}>{orFmtUSD(o.totalUsd)}</b>} />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <InfoBlock title="Customer" icon="user">
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{o.customer}</div>
              <div style={{ fontSize: 12.5, color: "var(--ad-muted)" }}>{o.email}</div>
            </InfoBlock>
            <InfoBlock title="Ship to" icon="pin">
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{o.city}, {o.country}</div>
              <div style={{ fontSize: 12.5, color: "var(--ad-muted)" }}>{o.market === "intl" ? "International · tracked & insured" : "Sri Lanka · island courier"}</div>
            </InfoBlock>
          </div>

          {!refunded && !cancelled && (
            <div className="ad-card" style={{ padding: 16, borderColor: "rgba(192,73,47,.3)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--neg)" }}>Refund this order</div>
                  <div style={{ fontSize: 12, color: "var(--ad-muted)", marginTop: 2 }}>{o.market === "local" ? "Refund the customer in PayHere first. Confirming here records that completed manual refund and restocks the items." : `Refunds ${orFmtUSD(o.totalUsd)} through Stripe, then marks the order refunded and restocks items.`}</div>
                  {o.market === "local" && confirmRefund && <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, fontSize: 12.5, color: "var(--ad-ink)" }}><input type="checkbox" checked={manualRefundDone} onChange={(e) => setManualRefundDone(e.target.checked)} />I completed the refund in PayHere</label>}
                </div>
                {!confirmRefund ? (
                  <button className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => setConfirmRefund(true)}><AIcon name="refund" size={15} stroke="var(--neg)" />Refund</button>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setConfirmRefund(false)}>Cancel</button>
                    <button className="ad-btn ad-btn-sm" disabled={o.market === "local" && !manualRefundDone} style={{ background: "var(--neg)", color: "#fff" }} onClick={() => { onRefund(o, manualRefundDone); setConfirmRefund(false); }}>Confirm refund</button>
                  </div>
                )}
              </div>
            </div>
          )}
          {refunded && <div style={{ textAlign: "center", fontSize: 13, color: "var(--neg)", fontWeight: 700, padding: "8px 0" }}>This order was fully refunded.</div>}
        </div>
      </aside>
    </>
  );
}

export function AdminOrders() {
  const [tab, setTab] = React.useState("all");
  const [market, setMarket] = React.useState("all");
  const [q, setQ] = React.useState("");
  // Demo rows only in demo mode — a real admin must never see fabricated orders,
  // even if the live fetch fails or returns empty (BUG-20).
  const [orders, setOrders] = React.useState<AdminOrder[]>(() => DEMO_MODE ? ADMIN.ORDERS.map((o) => ({ ...o })) : []);
  const [open, setOpen] = React.useState<AdminOrder | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [total, setTotal] = React.useState(DEMO_MODE ? ADMIN.ORDERS.length : 0);
  const [serverCounts, setServerCounts] = React.useState<Record<string, number>>({});
  const [cursor, setCursor] = React.useState<string | undefined>();
  const [cursorHistory, setCursorHistory] = React.useState<Array<string | undefined>>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      listAdminOrders({
        status: tab === "all" ? undefined : tab.toUpperCase(),
        market: market === "all" ? undefined : market === "local" ? "LOCAL" : "INTERNATIONAL",
        q: q.trim() || undefined,
        cursor,
        limit: 20,
      }).then(({ items, nextCursor: next, total: matchingTotal, counts: responseCounts }) => {
        if (!active) return;
        setOrders(items?.map(backendOrderToAdmin) ?? []);
        setNextCursor(next);
        setTotal(matchingTotal ?? 0);
        setServerCounts(Object.fromEntries(Object.entries(responseCounts ?? {}).map(([key, value]) => [key.toLowerCase(), value])));
      }).catch((error) => {
        if (active) setActionError((error as Error)?.message || "Could not load orders.");
      }).finally(() => { if (active) setLoading(false); });
    }, q ? 300 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [tab, market, q, cursor, refreshKey]);

  const counts = React.useMemo(() => {
    if (!DEMO_MODE) return serverCounts;
    const c: Record<string, number> = { all: orders.length };
    ORDER_TABS.forEach((t) => { if (t.key !== "all") c[t.key] = orders.filter((o) => o.status === t.key).length; });
    return c;
  }, [orders, serverCounts]);

  const filtered = React.useMemo(() => DEMO_MODE ? orders.filter((o) => {
    if (tab !== "all" && o.status !== tab) return false;
    if (market !== "all" && o.market !== market) return false;
    if (q) { const s = q.toLowerCase(); if (!o.id.toLowerCase().includes(s) && !formatOrderNumber(o.id).toLowerCase().includes(s) && !o.customer.toLowerCase().includes(s) && !o.email.toLowerCase().includes(s)) return false; }
    return true;
  }) : orders, [orders, tab, market, q]);

  const resetPage = () => { setCursor(undefined); setCursorHistory([]); };
  const openOrder = async (summary: AdminOrder) => {
    setActionError(null);
    if (DEMO_MODE) { setOpen(summary); return; }
    try {
      const { order } = await getAdminOrder(summary.id);
      setOpen(backendOrderToAdmin(order));
    } catch (error) {
      setActionError((error as Error)?.message || "Could not load the full order timeline.");
    }
  };

  const setStatus = async (o: AdminOrder, status: string, trackingNumber?: string) => {
    setActionError(null);
    try {
      await updateOrderStatus(o.id, { status: status.toUpperCase(), ...(trackingNumber ? { trackingNumber } : {}) });
      const { order } = await getAdminOrder(o.id);
      const updated = backendOrderToAdmin(order);
      setOrders((list) => list.map((x) => x.id === o.id ? updated : x));
      setOpen(updated);
      setRefreshKey((value) => value + 1);
    } catch (e) {
      setActionError((e as Error)?.message || `Couldn't update the order to ${status}.`);
    }
  };
  const refund = async (o: AdminOrder, manualGatewayRefundCompleted: boolean) => {
    // Do NOT PATCH the status to REFUNDED first: that flips the order out of
    // PAID/PROCESSING, so the refund endpoint's guard rejects with 409 and no
    // Stripe refund / stock restore happens (BUG-07). Call the refund endpoint
    // only — it performs the status change, stock restore and gateway refund
    // atomically — and surface failures instead of swallowing them.
    setActionError(null);
    try {
      await refundOrder(o.id, manualGatewayRefundCompleted);
      const { order } = await getAdminOrder(o.id);
      const updated = backendOrderToAdmin(order);
      setOrders((prev) => prev.map((x) => x.id === o.id ? updated : x));
      setOpen(updated);
      setRefreshKey((value) => value + 1);
    } catch (e) {
      try {
        const { order } = await getAdminOrder(o.id);
        const refreshed = backendOrderToAdmin(order);
        setOrders((prev) => prev.map((x) => x.id === o.id ? refreshed : x));
        setOpen(refreshed);
      } catch { /* preserve the last known state */ }
      setActionError((e as Error)?.message || "Refund failed — the order was not refunded.");
    }
  };

  const exportOrders = () => {
    // Map explicitly — AdminOrder rows carry `totalUsd` (a number), not `total`,
    // so passing the "total" key emitted an empty column for every row (REGRESSION-01).
    exportCsv(
      `orders-${new Date().toISOString().slice(0, 10)}`,
      ["Order", "Customer", "Email", "Market", "Status", "Total (USD)"],
      filtered.map((o) => ({
        id: formatOrderNumber(o.id),
        customer: o.customer,
        email: o.email,
        market: o.market,
        status: o.status,
        total: o.totalUsd.toFixed(2),
      })),
      ["id", "customer", "email", "market", "status", "total"],
    );
  };

  const pendingCount = (counts.paid || 0) + (counts.processing || 0);

  return (
    <div>
      <div className="ad-pagehd">
        <div>
          <div className="ad-eyebrow">Operations</div>
          <h1 className="ad-title" style={{ marginTop: 6 }}>Orders</h1>
          <p className="ad-sub">{total} matching orders · <b style={{ color: "var(--warn)" }}>{pendingCount} awaiting fulfillment</b></p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={exportOrders}><AIcon name="download" size={15} stroke="var(--ad-muted)" />Export CSV</button>
        </div>
      </div>
      {actionError && (
        <div role="alert" style={{ margin: "0 0 16px", padding: "11px 14px", borderRadius: 9, background: "rgba(192,83,31,.1)", border: "1px solid rgba(192,83,31,.35)", color: "var(--neg, #C0531F)", fontSize: 13, fontWeight: 600, display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} style={{ background: "none", border: 0, cursor: "pointer", color: "inherit", fontWeight: 700 }}>Dismiss</button>
        </div>
      )}
      <OrdersToolbar tab={tab} setTab={(value) => { setTab(value); resetPage(); }} market={market} setMarket={(value) => { setMarket(value); resetPage(); }} q={q} setQ={(value) => { setQ(value); resetPage(); }} counts={counts} />
      <OrdersTable orders={filtered} onOpen={(order) => { void openOrder(order); }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, fontSize: 12.5, color: "var(--ad-faint)" }}>
        <span>{loading ? "Loading orders…" : `Showing ${total === 0 ? 0 : cursorHistory.length * 20 + 1}–${cursorHistory.length * 20 + filtered.length} of ${total} orders`}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ad-btn ad-btn-ghost ad-btn-sm" disabled={cursorHistory.length === 0 || loading} style={{ opacity: cursorHistory.length === 0 ? 0.5 : 1 }} onClick={() => { const history = [...cursorHistory]; const previous = history.pop(); setCursorHistory(history); setCursor(previous); }}><AIcon name="chevronL" size={14} stroke="var(--ad-muted)" />Prev</button>
          <button className="ad-btn ad-btn-ghost ad-btn-sm" disabled={!nextCursor || loading} onClick={() => { if (!nextCursor) return; setCursorHistory((history) => [...history, cursor]); setCursor(nextCursor); }}>Next<AIcon name="chevronR" size={14} stroke="var(--ad-muted)" /></button>
        </div>
      </div>
      {open && <OrderDrawer order={open} onClose={() => setOpen(null)} onStatus={setStatus} onRefund={refund} />}
    </div>
  );
}
