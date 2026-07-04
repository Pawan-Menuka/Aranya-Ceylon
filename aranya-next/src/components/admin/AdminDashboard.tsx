"use client";

import * as React from "react";
import { ADMIN } from "@/lib/admin-data";
import { getDashboard, type DashboardData } from "@/lib/api/admin";
import { exportCsv } from "@/lib/csv";
import { AreaChart, AreaChartLight, Donut, Spark, ShareBar } from "./AdminCharts";
import { AIcon, Delta, Pill, MarketTag, Avatar, SectionCard, StatCard } from "./AdminPrimitives";

// Aranya Ceylon — ADMIN Dashboard (ported from admin-dashboard.jsx).
// 3 layout variations (Command / Editorial / Dense) + market-aware charts.

type Market = "all" | "intl" | "local";

/* ---------- live dashboard data hook ---------- */
function useLiveDash() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  React.useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => { /* keep null — fallback to demo */ });
  }, []);
  return data;
}

/* ---------- market-aware series + kpis (demo fallback) ---------- */
function useDashData(market: Market, live: DashboardData | null) {
  return React.useMemo(() => {
    const A = ADMIN;
    const key = market === "intl" ? "intl" : market === "local" ? "local" : "all";
    const series = A.days.map((d) => ({
      label: d.label,
      value: key === "intl" ? d.intl : key === "local" ? d.revUsd - d.intl : d.revUsd,
      orders: d.orders,
    }));
    const scale = key === "all" ? 1 : key === "intl" ? 0.61 : 0.39;
    const k = A.KPIS;
    const last7v = series.slice(-7).map((d) => d.value);

    // Override KPI values with live data when available
    const liveLocal = live?.revenue?.local;
    const liveIntl = live?.revenue?.international;
    const liveOrders = live?.orders;

    // LKR converted at a fixed rate — approximate; display context makes this clear
    const localRevUsd = liveLocal?.total ? Number(liveLocal.total) / 300 : 0;
    const intlRevUsd = liveIntl?.total ? Number(liveIntl.total) : 0;
    const allRevUsd = localRevUsd + intlRevUsd;
    const totalOrders = (liveOrders?.localCount ?? 0) + (liveOrders?.intlCount ?? 0);
    // P6-3: paid-order count (contributed to revenue) for AOV denominator
    const paidOrders = (liveLocal?.orders ?? 0) + (liveIntl?.orders ?? 0);

    const last30Rev = live
      ? key === "intl" ? intlRevUsd : key === "local" ? localRevUsd : allRevUsd
      : series.reduce((a, d) => a + d.value, 0);

    const last30Ord = live
      ? key === "intl" ? (liveOrders?.intlCount ?? 0) : key === "local" ? (liveOrders?.localCount ?? 0) : totalOrders
      : Math.round(k.last30Ord * scale);

    const pending = live ? (liveOrders?.pendingFulfilment ?? 0) : (market === "local" ? 6 : market === "intl" ? 12 : k.pendingFulfillment);
    const lowStockCount = live ? (live.lowStockVariants?.length ?? 0) : A.LOW_STOCK.length;

    return {
      series,
      todayRev: live ? (key === "intl" ? intlRevUsd / 30 : key === "local" ? localRevUsd / 30 : allRevUsd / 30) : series[series.length - 1].value,
      todayOrders: live ? Math.round(last30Ord / 30) : Math.round(k.todayOrders * scale),
      last30Rev,
      last30Ord,
      aov: live && paidOrders > 0 ? Math.round(allRevUsd / paidOrders) : k.aov,
      pending,
      lowStockCount,
      spark7: last7v,
      revChange: k.revChange, ordChange: k.ordChange, aovChange: k.aovChange,
      conversion: k.conversion, convChange: k.convChange,
      newCustomers: Math.round(k.newCustomers * scale),
    };
  }, [market, live]);
}

type DashData = ReturnType<typeof useDashData>;

const fmtK = (n: number) => "$" + (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : Math.round(n));
const fmtUSD0 = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

interface DashProps {
  d: DashData;
  live: DashboardData | null;
  market: Market;
  setMarket: (m: Market) => void;
  range: string;
  setRange: (r: string) => void;
  go: (r: string) => void;
}

/* ============================ shared blocks ============================ */

function RevenueCard({ d, market, setMarket, range, setRange, height = 230, title = "Revenue" }: {
  d: DashData; market: Market; setMarket: (m: Market) => void; range: string; setRange?: (r: string) => void; height?: number; title?: string;
}) {
  return (
    <div className="ad-card" style={{ overflow: "hidden" }}>
      <div className="ad-card-h" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="ad-card-t" style={{ marginBottom: 8 }}>{title}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span className="disp tnum" style={{ fontSize: 30, fontWeight: 600, color: "var(--ad-ink)", lineHeight: 1 }}>{fmtUSD0(d.last30Rev)}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Delta value={d.revChange} />
              <span style={{ fontSize: 12, color: "var(--ad-faint)", fontWeight: 600 }}>vs prev. 30 days</span>
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <div className="ad-seg">
            {(["intl", "all", "local"] as Market[]).map((m) => (
              <button key={m} className={market === m ? "on" : ""} onClick={() => setMarket(m)}>{m === "all" ? "All" : m === "intl" ? "USD" : "LKR"}</button>
            ))}
          </div>
          {setRange && (
            <div className="ad-seg">
              {["7d", "30d", "90d"].map((r) => <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{r}</button>)}
            </div>
          )}
        </div>
      </div>
      <div style={{ padding: "16px 16px 10px" }}>
        <AreaChart data={range === "7d" ? d.series.slice(-7) : d.series} height={height} stroke="#0F6E56" fill="#0F6E56" accent="#BA7517" />
      </div>
    </div>
  );
}

function timeSince(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const AUDIT_ICON: Record<string, { icon: string; tone: string }> = {
  ORDER_PLACED: { icon: "box", tone: "brand" },
  ORDER_STATUS_UPDATE: { icon: "truck", tone: "slate" },
  PRODUCT_CREATE: { icon: "tag", tone: "brand" },
  PRODUCT_UPDATE: { icon: "tag", tone: "slate" },
  PRODUCT_ARCHIVE: { icon: "trash", tone: "red" },
  REFUND_ISSUED: { icon: "refund", tone: "red" },
  BLOG_CREATE: { icon: "blog", tone: "slate" },
  BLOG_PUBLISH: { icon: "star", tone: "brand" },
  BLOG_UPDATE: { icon: "blog", tone: "slate" },
  BLOG_DELETE: { icon: "trash", tone: "red" },
  RECIPE_CREATE: { icon: "star", tone: "slate" },
  RECIPE_UPDATE: { icon: "star", tone: "slate" },
  GIFT_CREATE: { icon: "star", tone: "amber" },
  GIFT_UPDATE: { icon: "star", tone: "amber" },
};

function MarketDonutCard({ live }: { live: DashboardData | null }) {
  const A = ADMIN;
  const liveSegs = live?.revenue
    ? [
        { key: "intl", label: "International (USD)", value: Number(live.revenue.international.total), color: "#BA7517" },
        { key: "local", label: "Local (LKR ÷300 est.)", value: Number(live.revenue.local.total) / 300, color: "#0F6E56" },
      ]
    : null;
  const segs = liveSegs ?? A.MARKET_SPLIT;
  const total = segs.reduce((a, s) => a + s.value, 0);
  return (
    <SectionCard title="Revenue by market" action={<span style={{ fontSize: 11.5, color: "var(--ad-faint)", fontWeight: 600 }}>Last 30 days</span>}
      style={{ display: "flex", flexDirection: "column" }} bodyStyle={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "10px 0 18px" }}>
          <Donut segs={segs} size={150} thickness={20} centerTop={fmtK(total)} centerSub="Total" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, borderTop: "1px solid var(--ad-line)", paddingTop: 18 }}>
          {segs.map((s) => (
            <div key={s.key}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600, color: "var(--ad-ink)" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color }} />{s.label}
                </span>
                <span className="tnum" style={{ fontSize: 12.5, fontWeight: 700 }}>{Math.round((s.value / total) * 100)}%</span>
              </div>
              <ShareBar value={(s.value / total) * 100} color={s.color} />
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function TopProductsCard({ compact, live }: { compact?: boolean; live: DashboardData | null }) {
  const A = ADMIN;
  const liveProducts = live?.topProducts;
  const totalRev = liveProducts ? liveProducts.reduce((s, p) => s + p.revenue, 0) : 0;
  return (
    <SectionCard title="Top products" pad={false} action={<button className="ad-btn ad-btn-ghost ad-btn-sm">View all</button>}>
      <table className="ad-table flat">
        <thead>
          <tr>
            <th>Product</th><th>Units</th><th>Revenue</th>
            {!compact && !liveProducts && <th>30-day trend</th>}
            <th style={{ textAlign: "right" }}>Share</th>
          </tr>
        </thead>
        <tbody>
          {liveProducts
            ? liveProducts.map((p) => (
              <tr key={p.name}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <span className="swatch" style={{ background: "var(--brand)" }} />
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                  </div>
                </td>
                <td className="tnum" style={{ color: "var(--ad-muted)" }}>{p.units.toLocaleString()}</td>
                <td className="tnum" style={{ fontWeight: 700 }}>{fmtUSD0(p.revenue)}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <div style={{ width: 50 }}><ShareBar value={totalRev > 0 ? (p.revenue / totalRev) * 100 : 0} color="var(--brand)" h={6} /></div>
                    <span className="tnum" style={{ fontSize: 12, fontWeight: 700, width: 30, textAlign: "right" }}>
                      {totalRev > 0 ? Math.round((p.revenue / totalRev) * 100) : 0}%
                    </span>
                  </div>
                </td>
              </tr>
            ))
            : A.TOP_PRODUCTS.map((p) => (
              <tr key={p.name}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <span className="swatch" style={{ background: `radial-gradient(70% 70% at 50% 35%, ${p.color} 0%, ${p.color}cc 95%)` }} />
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                  </div>
                </td>
                <td className="tnum" style={{ color: "var(--ad-muted)" }}>{p.units.toLocaleString()}</td>
                <td className="tnum" style={{ fontWeight: 700 }}>{fmtUSD0(p.revUsd)}</td>
                {!compact && <td><Spark data={p.trend} stroke={p.color} width={80} height={26} /></td>}
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <div style={{ width: 50 }}><ShareBar value={p.share * 4} color={p.color} h={6} /></div>
                    <span className="tnum" style={{ fontSize: 12, fontWeight: 700, width: 30, textAlign: "right" }}>{p.share}%</span>
                  </div>
                </td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </SectionCard>
  );
}

function LowStockCard({ onGo, live }: { onGo: () => void; live: DashboardData | null }) {
  const A = ADMIN;
  const liveItems = live?.lowStockVariants;
  const items = liveItems ?? A.LOW_STOCK;
  const count = items.length;
  return (
    <SectionCard title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><AIcon name="alert" size={15} stroke="var(--neg)" />Low stock</span>}
      action={<span className="pill out" style={{ textTransform: "none" }}>{count} items</span>}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {liveItems
          ? liveItems.slice(0, 6).map((v) => (
            <div key={v.id} className="alert-row">
              <span className="swatch" style={{ width: 26, height: 26, background: "var(--brand)" }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.product.name} · {v.sku}</div>
                <div style={{ fontSize: 11.5, color: "var(--ad-faint)" }}>{v.sku}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="tnum" style={{ fontSize: 16, fontWeight: 800, color: v.stock < 8 ? "var(--neg)" : "var(--warn)" }}>{v.stock}</div>
                <div style={{ fontSize: 10, color: "var(--ad-faint)", fontWeight: 600 }}>left</div>
              </div>
            </div>
          ))
          : A.LOW_STOCK.map((s) => (
            <div key={s.sku} className="alert-row">
              <span className="swatch" style={{ width: 26, height: 26, background: `radial-gradient(70% 70% at 50% 35%, ${s.color}, ${s.color}bb)` }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name} · {s.weight}</div>
                <div style={{ fontSize: 11.5, color: "var(--ad-faint)" }}>{s.sku} · threshold {s.threshold}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="tnum" style={{ fontSize: 16, fontWeight: 800, color: s.stock < 8 ? "var(--neg)" : "var(--warn)" }}>{s.stock}</div>
                <div style={{ fontSize: 10, color: "var(--ad-faint)", fontWeight: 600 }}>left</div>
              </div>
            </div>
          ))
        }
      </div>
      <button className="ad-btn ad-btn-ghost ad-btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} onClick={onGo}>Restock products</button>
    </SectionCard>
  );
}

function WholesaleCard({ onGo, live }: { onGo: () => void; live: DashboardData | null }) {
  const A = ADMIN;
  const pending = A.WHOLESALE.filter((w) => w.status === "pending" || w.status === "review");
  return (
    <SectionCard title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><AIcon name="handshake" size={16} stroke="var(--warn)" />Wholesale applications</span>}
      action={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {live && <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ad-faint)", letterSpacing: ".04em" }}>demo</span>}
          <span className="pill pending" style={{ textTransform: "none" }}>{pending.length} pending</span>
        </span>
      }>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {A.WHOLESALE.slice(0, 4).map((w) => (
          <div key={w.id} className="alert-row">
            <Avatar name={w.company} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.company}</div>
              <div style={{ fontSize: 11.5, color: "var(--ad-faint)" }}>{w.type} · {w.country} · {w.volume}</div>
            </div>
            <Pill status={w.status} />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function FulfillmentCard({ onOpen, live }: { onOpen: () => void; live: DashboardData | null }) {
  const A = ADMIN;
  const queue = A.ORDERS.filter((o) => o.status === "paid" || o.status === "processing").slice(0, 6);
  return (
    <SectionCard title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><AIcon name="truck" size={16} stroke="var(--slate)" />Fulfillment queue</span>} pad={false}
      action={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {live && <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ad-faint)", letterSpacing: ".04em" }}>demo</span>}
          <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={onOpen}>Open orders</button>
        </span>
      }>
      <table className="ad-table flat">
        <tbody>
          {queue.map((o) => (
            <tr key={o.id} onClick={onOpen} style={{ cursor: "pointer" }}>
              <td style={{ fontWeight: 700, fontFamily: "var(--font-ui)" }}>{o.id}</td>
              <td style={{ color: "var(--ad-muted)" }}>{o.customer}</td>
              <td><MarketTag market={o.market} /></td>
              <td className="tnum" style={{ fontWeight: 700, textAlign: "right" }}>{fmtUSD0(o.totalUsd)}</td>
              <td style={{ textAlign: "right" }}><Pill status={o.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}

function ActivityCard({ live }: { live: DashboardData | null }) {
  const A = ADMIN;
  const toneMap: Record<string, string> = { brand: "#0F6E56", amber: "#BA7517", red: "#C0492F", slate: "#5E7587" };
  const renderText = (t: string) => {
    const parts = t.split("**");
    return parts.map((p, i) => (i % 2 ? <b key={i} style={{ fontWeight: 700 }}>{p}</b> : <span key={i}>{p}</span>));
  };
  const liveActivity = live?.recentAuditLogs?.map((e) => {
    const info = AUDIT_ICON[e.event] ?? { icon: "audit", tone: "slate" };
    const who = (e.actor as { name?: string } | undefined)?.name ?? e.actorRole ?? "System";
    const label = e.event.toLowerCase().replace(/_/g, " ");
    return { icon: info.icon, tone: info.tone, text: `**${label}**`, who, when: timeSince(e.createdAt) };
  });
  const activity = liveActivity ?? A.ACTIVITY;
  return (
    <SectionCard title="Recent activity" action={<span style={{ fontSize: 11.5, color: "var(--ad-faint)", fontWeight: 600 }}>{live ? "Live" : "Demo"}</span>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {activity.map((a, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < activity.length - 1 ? "1px solid var(--ad-line)" : 0 }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, flex: "0 0 auto", display: "grid", placeItems: "center", background: toneMap[a.tone] + "18" }}>
              <AIcon name={a.icon} size={15} stroke={toneMap[a.tone]} w={1.9} />
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ad-ink)" }}>{renderText(a.text)}</div>
              <div style={{ fontSize: 11.5, color: "var(--ad-faint)", marginTop: 2 }}>{a.who} · {a.when}</div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* alert tile for editorial layout */
function AlertTile({ icon, tone, value, label, sub, onGo }: { icon: string; tone: string; value: React.ReactNode; label: string; sub: string; onGo: () => void }) {
  const toneMap: Record<string, string> = { red: "#C0492F", amber: "#BA7517", slate: "#5E7587", brand: "#0F6E56" };
  const c = toneMap[tone];
  return (
    <button onClick={onGo} style={{ textAlign: "left", cursor: "pointer", background: "var(--ad-card)", border: "1px solid var(--ad-line)", borderRadius: 14, padding: 16, boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", gap: 14, width: "100%" }}>
      <span style={{ width: 44, height: 44, borderRadius: 11, flex: "0 0 auto", display: "grid", placeItems: "center", background: c + "16" }}>
        <AIcon name={icon} size={21} stroke={c} w={1.8} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="disp tnum" style={{ fontSize: 27, fontWeight: 600, color: "var(--ad-ink)" }}>{value}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ad-ink)" }}>{label}</span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ad-faint)" }}>{sub}</div>
      </div>
      <AIcon name="chevronR" size={16} stroke="var(--ad-faint)" />
    </button>
  );
}

/* ============================ VARIATION A — COMMAND ============================ */
function DashCommand({ d, live, market, setMarket, range, setRange, go }: DashProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        <StatCard label="Today's revenue" icon="money" big value={fmtUSD0(d.todayRev)} delta={d.revChange} spark={d.spark7} accentBar="#0F6E56" sub="Updated live" />
        <StatCard label="Orders today" icon="orders" big value={d.todayOrders} delta={d.ordChange} spark={d.series.slice(-7).map((s) => s.orders)} sparkColor="#5E7587" sub="vs 7-day avg" />
        <StatCard label="Avg. order value" icon="tag" big value={fmtUSD0(d.aov)} delta={d.aovChange} sub="Last 30 days" />
        <StatCard label="Pending fulfillment" icon="truck" big value={d.pending} accentBar="#BA7517" sub="Awaiting shipment" delta={-2.0} deltaInvert />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.62fr 1fr", gap: 18, alignItems: "start" }}>
        <RevenueCard d={d} market={market} setMarket={setMarket} range={range} setRange={setRange} height={250} title="Revenue trend" />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <LowStockCard onGo={() => go("products")} live={live} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.62fr 1fr", gap: 18, alignItems: "start" }}>
        <TopProductsCard live={live} />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <WholesaleCard onGo={() => go("orders")} live={live} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, alignItems: "start" }}>
        <FulfillmentCard onOpen={() => go("orders")} live={live} />
        <MarketDonutCard live={live} />
        <ActivityCard live={live} />
      </div>
    </div>
  );
}

/* ============================ VARIATION B — EDITORIAL SPLIT ============================ */
function DashEditorial({ d, live, market, setMarket, range, go }: DashProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 18, alignItems: "stretch" }}>
        {/* forest hero revenue */}
        <div style={{ background: "linear-gradient(150deg,#0F6E56 0%, #0B5A48 60%, #0A4A3C 100%)", color: "#FDFAF5", borderRadius: 18, padding: "26px 30px", position: "relative", overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 70% at 85% 0%, rgba(230,184,96,.18), transparent 60%)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div className="ad-eyebrow" style={{ color: "#E6B860" }}>Today · June 4, 2026</div>
                <div className="disp" style={{ fontSize: 62, fontWeight: 600, lineHeight: 1, marginTop: 10, letterSpacing: ".01em" }}>{fmtUSD0(d.todayRev)}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: "#9FE3C4" }}>
                    <AIcon name="arrowUp" size={14} stroke="#9FE3C4" w={2.4} />{d.revChange.toFixed(1)}% this week
                  </span>
                  <span style={{ fontSize: 12.5, color: "rgba(253,250,245,.7)" }}>{d.todayOrders} orders today</span>
                </div>
              </div>
              <div className="ad-seg dark" style={{ background: "rgba(253,250,245,.12)", border: "1px solid rgba(253,250,245,.18)" }}>
                {(["intl", "all", "local"] as Market[]).map((m) => (
                  <button key={m} className={market === m ? "on" : ""} onClick={() => setMarket(m)} style={market === m ? {} : { color: "rgba(253,250,245,.7)" }}>{m === "all" ? "All" : m === "intl" ? "USD" : "LKR"}</button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 18, marginLeft: -6, marginRight: -6 }}>
              <AreaChartLight data={range === "7d" ? d.series.slice(-7) : d.series.slice(-14)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0, marginTop: 18, borderTop: "1px solid rgba(253,250,245,.16)", paddingTop: 16 }}>
              {[["30-day revenue", fmtUSD0(d.last30Rev)], ["Avg. order", fmtUSD0(d.aov)], ["Conversion", d.conversion + "%"]].map((s, i) => (
                <div key={s[0]} style={{ paddingLeft: i ? 20 : 0, borderLeft: i ? "1px solid rgba(253,250,245,.16)" : "none" }}>
                  <div className="disp tnum" style={{ fontSize: 26, fontWeight: 600, color: "#fff" }}>{s[1]}</div>
                  <div style={{ fontSize: 11, color: "rgba(253,250,245,.65)", fontWeight: 600, letterSpacing: ".04em", marginTop: 3 }}>{s[0]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* needs attention */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="ad-eyebrow" style={{ color: "var(--ad-faint)", marginBottom: -2 }}>Needs attention</div>
          <AlertTile icon="truck" tone="amber" value={d.pending} label="to fulfill" sub="Orders awaiting shipment" onGo={() => go("orders")} />
          <AlertTile icon="alert" tone="red" value={d.lowStockCount} label="low stock" sub="Items below threshold — restock soon" onGo={() => go("products")} />
          <AlertTile icon="handshake" tone="brand" value={ADMIN.WHOLESALE.filter((w) => w.status !== "approved").length} label="wholesale" sub="Applications pending review" onGo={() => go("orders")} />
          <AlertTile icon="users" tone="slate" value={d.newCustomers} label="new customers" sub="Joined the Harvest Club this week" onGo={() => go("orders")} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18, alignItems: "start" }}>
        <TopProductsCard live={live} />
        <MarketDonutCard live={live} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>
        <FulfillmentCard onOpen={() => go("orders")} live={live} />
        <ActivityCard live={live} />
      </div>
    </div>
  );
}

/* ============================ VARIATION C — DENSE OPS ============================ */
function MiniStat({ label, value, delta, deltaInvert, bar }: { label: string; value: React.ReactNode; delta?: number; deltaInvert?: boolean; bar?: string }) {
  return (
    <div style={{ background: "var(--ad-card)", border: "1px solid var(--ad-line)", borderRadius: 11, padding: "12px 14px", position: "relative", overflow: "hidden" }}>
      {bar && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: bar }} />}
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ad-faint)" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6, marginTop: 6 }}>
        <span className="disp tnum" style={{ fontSize: 26, fontWeight: 600, color: "var(--ad-ink)", lineHeight: 1 }}>{value}</span>
        {delta != null && <Delta value={delta} invert={deltaInvert} />}
      </div>
    </div>
  );
}

function DashDense({ d, live, market, setMarket, range, setRange, go }: DashProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12 }}>
        <MiniStat label="Today rev." value={fmtUSD0(d.todayRev)} delta={d.revChange} bar="#0F6E56" />
        <MiniStat label="Orders" value={d.todayOrders} delta={d.ordChange} />
        <MiniStat label="AOV" value={fmtUSD0(d.aov)} delta={d.aovChange} />
        <MiniStat label="Pending" value={d.pending} bar="#BA7517" delta={-2} deltaInvert />
        <MiniStat label="Low stock" value={d.lowStockCount} bar="#C0492F" />
        <MiniStat label="Conversion" value={d.conversion + "%"} delta={d.convChange} />
      </div>
      {/* chart row — chart + market split, balanced heights */}
      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 16, alignItems: "stretch" }}>
        <RevenueCard d={d} market={market} setMarket={setMarket} range={range} setRange={setRange} height={220} title="Revenue trend" />
        <MarketDonutCard live={live} />
      </div>
      {/* operations row — three equal queues */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, alignItems: "stretch" }}>
        <FulfillmentCard onOpen={() => go("orders")} live={live} />
        <LowStockCard onGo={() => go("products")} live={live} />
        <WholesaleCard onGo={() => go("orders")} live={live} />
      </div>
      {/* detail row — top products table + activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, alignItems: "stretch" }}>
        <TopProductsCard compact live={live} />
        <ActivityCard live={live} />
      </div>
    </div>
  );
}

/* ============================ DASHBOARD (with layout switcher) ============================ */
const DASH_LAYOUTS = [
  { key: "command", label: "Command", note: "Operations-led" },
  { key: "editorial", label: "Editorial", note: "Branded split" },
  { key: "dense", label: "Dense ops", note: "Max data" },
];

export function AdminDashboard({ go }: { go: (r: string) => void }) {
  const [layout, setLayout] = React.useState<string>(() =>
    (typeof window !== "undefined" && localStorage.getItem("ad_dash_layout")) || "command"
  );
  const [market, setMarket] = React.useState<Market>("all");
  const [range, setRange] = React.useState("30d");
  const live = useLiveDash();
  const d = useDashData(market, live);
  const setL = (k: string) => { setLayout(k); if (typeof window !== "undefined") localStorage.setItem("ad_dash_layout", k); };
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const exportDashboard = () => {
    // Export the live top-products table (the concrete, real figures on the page).
    const rows = live?.topProducts ?? [];
    exportCsv(
      `dashboard-top-products-${new Date().toISOString().slice(0, 10)}`,
      ["Product", "Slug", "Units", "Revenue (USD)"],
      rows as unknown as Array<Record<string, unknown>>,
      ["name", "slug", "units", "revenue"],
    );
  };

  return (
    <div>
      <div className="ad-pagehd">
        <div>
          <div className="ad-eyebrow">{today}</div>
          <h1 className="ad-title" style={{ marginTop: 6 }}>Dashboard</h1>
          <p className="ad-sub">Here&apos;s how Aranya Ceylon is moving today.{live ? " · Fulfillment and wholesale panels show sample data." : " (demo data)"}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ad-faint)" }}>Layout</span>
            <div className="ad-seg dark">
              {DASH_LAYOUTS.map((l) => (
                <button key={l.key} className={layout === l.key ? "on" : ""} onClick={() => setL(l.key)} title={l.note}>{l.label}</button>
              ))}
            </div>
          </div>
          <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={exportDashboard}><AIcon name="download" size={15} stroke="var(--ad-muted)" />Export</button>
          <button className="ad-btn ad-btn-amber ad-btn-sm" onClick={() => go("products")}><AIcon name="plus" size={15} stroke="#fff" />New product</button>
        </div>
      </div>
      {layout === "command" && <DashCommand d={d} live={live} market={market} setMarket={setMarket} range={range} setRange={setRange} go={go} />}
      {layout === "editorial" && <DashEditorial d={d} live={live} market={market} setMarket={setMarket} range={range} setRange={setRange} go={go} />}
      {layout === "dense" && <DashDense d={d} live={live} market={market} setMarket={setMarket} range={range} setRange={setRange} go={go} />}
    </div>
  );
}
