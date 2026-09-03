"use client";

import * as React from "react";
import type { Market } from "@/lib/types";
import { SpicePhoto } from "../primitives/SpicePhoto";
import { CardCFinal } from "../cards/Cards";
import {
  ACCOUNT, ACCOUNT_SPICES, acFmt, acOrderTotal, orderMarketOf, wishlistSpices, toAccountOrder,
  type AccountOrder,
} from "@/lib/account-data";
import { listOrders } from "@/lib/api/orders";
import { patchMe, getAddresses, createAddress, deleteAddress, type SavedAddress } from "@/lib/api/auth";
import { getWishlist, removeFromWishlist, type WishlistItem } from "@/lib/api/wishlist";
import { useMarket } from "../MarketContext";
import { useCart } from "../CartContext";
import { useAuth } from "../AuthContext";
import { StatusPill, TrackingSummary, OrderDetailView } from "./AccountTracking";

// Account dashboard shell (ported from account.jsx AccountShell). Sidebar nav +
// overview / orders / order detail / addresses / wishlist / profile. Reorder
// pushes lines into the live cart context; sign-out clears the auth session.

const AC_NAV = [
  { key: "overview", label: "Overview", icon: "grid" },
  { key: "orders", label: "Orders", icon: "box" },
  { key: "addresses", label: "Addresses", icon: "pin" },
  { key: "wishlist", label: "Wishlist", icon: "heart" },
  { key: "profile", label: "Profile", icon: "user" },
] as const;

type View = "overview" | "orders" | "detail" | "addresses" | "wishlist" | "profile";

function NavIcon({ name, stroke }: { name: string; stroke: string }) {
  const p: Record<string, React.ReactNode> = {
    grid: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
    box: <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />,
    pin: (<><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>),
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />,
    user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>),
  };
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p[name]}</svg>;
}

function Sidebar({ view, setView, onSignOut, userName }: { view: View; setView: (v: View) => void; onSignOut: () => void; userName: string }) {
  const initials = userName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || ACCOUNT.user.initials;
  return (
    <aside style={{ flex: "0 0 256px", position: "sticky", top: 96, alignSelf: "start" }}>
      <div style={{ background: "var(--brand)", color: "#FDFAF5", borderRadius: 14, padding: "22px 22px 20px", marginBottom: 18, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 100% at 100% 0%, rgba(29,158,117,.5), transparent 55%)" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 13 }}>
          <span style={{ width: 48, height: 48, borderRadius: 999, background: "rgba(253,250,245,.14)", border: "1px solid rgba(230,184,96,.5)", display: "grid", placeItems: "center", flex: "0 0 auto", fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "#E6B860" }}>{initials}</span>
          <div style={{ minWidth: 0 }}>
            <div className="disp" style={{ fontSize: 21, lineHeight: 1.1, fontWeight: 600 }}>{userName}</div>
          </div>
        </div>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {AC_NAV.map((n) => {
          const on = view === n.key || (n.key === "orders" && view === "detail");
          return (
            <button key={n.key} onClick={() => setView(n.key as View)} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: on ? "var(--surface)" : "transparent", border: 0, borderRadius: 9, padding: "12px 14px", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: on ? 700 : 600, color: on ? "var(--brand)" : "var(--ink)", boxShadow: on ? "inset 3px 0 0 var(--brand)" : "none", transition: "background .15s" }}
              onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "rgba(15,110,86,.05)"; }}
              onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
              <NavIcon name={n.icon} stroke={on ? "var(--brand)" : "var(--muted)"} />{n.label}
            </button>
          );
        })}
      </nav>
      <div style={{ height: 1, background: "var(--line)", margin: "14px 0" }} />
      <button onClick={onSignOut} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", background: "none", border: 0, borderRadius: 9, padding: "12px 14px", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
        Sign out
      </button>
    </aside>
  );
}

function StatTile({ label, value, sub, onClick }: { label: string; value: React.ReactNode; sub?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ flex: "1 1 0", minWidth: 0, textAlign: "left", background: "#FFFDF9", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 20px", cursor: onClick ? "pointer" : "default" }}>
      <div className="disp" style={{ fontSize: 36, color: "var(--brand)", lineHeight: 1, fontWeight: 600 }}>{value}</div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, color: "var(--ink)", marginTop: 8 }}>{label}</div>
      {sub && <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
    </button>
  );
}

function OrderRow({ order, market, onOpen, onReorder }: { order: AccountOrder; market: Market; onOpen: (o: AccountOrder) => void; onReorder: (o: AccountOrder) => void }) {
  const om = orderMarketOf(order, market); // format in the order's own currency (BUG-18)
  const total = acOrderTotal(order, om);
  const n = order.items.reduce((a, it) => a + it.qty, 0);
  return (
    <div style={{ background: "#FFFDF9", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flex: "0 0 auto" }}>
          {order.items.slice(0, 3).map((it, i) => (
            <div key={it.key} style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", border: "2px solid #FFFDF9", marginLeft: i ? -12 : 0, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)" }}>
              <SpicePhoto spice={it} ratio="1 / 1" label={false} />
            </div>
          ))}
        </div>
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="disp" style={{ fontSize: 20, color: "var(--ink)", fontWeight: 600, whiteSpace: "nowrap" }}>{order.id}</span>
            <StatusPill status={order.status} size="sm" />
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>
            {order.placedLabel} · {n} {n === 1 ? "jar" : "jars"} · {order.status === "delivered" ? "Delivered " + order.deliveredLabel : "Arriving " + order.etaLabel}
          </div>
        </div>
        <div style={{ textAlign: "right", flex: "0 0 auto" }}>
          <div className="disp" style={{ fontSize: 22, color: "var(--ink)", fontWeight: 600 }}>{acFmt(total, om)}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
          <button onClick={() => onReorder(order)} style={{ background: "transparent", border: "1.5px solid var(--line)", color: "var(--ink)", borderRadius: 8, padding: "9px 14px", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700 }}>Reorder</button>
          <button onClick={() => onOpen(order)} className={market === "local" ? "btn btn-local" : "btn btn-intl"} style={{ width: "auto", padding: "9px 16px", fontSize: 13 }}>
            {order.status === "delivered" ? "View order" : "Track"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OverviewView({ market, activeOrder, orders, wishlistCount, onOpen, onReorder, setView, firstName }: { market: Market; activeOrder?: AccountOrder; orders: AccountOrder[]; wishlistCount: number; onOpen: (o: AccountOrder) => void; onReorder: (o: AccountOrder) => void; setView: (v: View) => void; firstName: string }) {
  const delivered = orders.filter((o) => o.status === "delivered").length;
  return (
    <div>
      <h1 className="disp" style={{ fontSize: 38, color: "var(--brand)", margin: "0 0 4px", lineHeight: 1.05 }}>Welcome back, {firstName}</h1>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--muted)", margin: "0 0 26px" }}>Here&rsquo;s what&rsquo;s moving in your pantry today.</p>
      {activeOrder && <div style={{ marginBottom: 24 }}><TrackingSummary order={activeOrder} market={market} onView={() => onOpen(activeOrder)} /></div>}
      <div style={{ display: "flex", gap: 14, marginBottom: 30, flexWrap: "wrap" }}>
        <StatTile value={orders.length} label="Total orders" sub={delivered + " delivered"} onClick={() => setView("orders")} />
        <StatTile value={wishlistCount} label="Saved spices" sub="In your wishlist" onClick={() => setView("wishlist")} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 className="disp" style={{ fontSize: 26, color: "var(--ink)", margin: 0, whiteSpace: "nowrap" }}>Recent orders</h2>
        <button onClick={() => setView("orders")} style={{ background: "none", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>View all →</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {orders.slice(0, 2).map((o) => <OrderRow key={o.id} order={o} market={market} onOpen={onOpen} onReorder={onReorder} />)}
      </div>
    </div>
  );
}

function OrdersView({ market, orders, onOpen, onReorder }: { market: Market; orders: AccountOrder[]; onOpen: (o: AccountOrder) => void; onReorder: (o: AccountOrder) => void }) {
  const [filter, setFilter] = React.useState("all");
  const tabs: [string, string][] = [["all", "All"], ["open", "In progress"], ["delivered", "Delivered"]];
  const shown = orders.filter((o) => (filter === "all" ? true : filter === "delivered" ? o.status === "delivered" : o.status !== "delivered"));
  return (
    <div>
      <h1 className="disp" style={{ fontSize: 36, color: "var(--brand)", margin: "0 0 18px", lineHeight: 1.05 }}>Your orders</h1>
      <div className="seg" style={{ marginBottom: 22 }}>
        {tabs.map(([k, l]) => <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{l}</button>)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {shown.length === 0 ? (
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", padding: "30px 0" }}>No orders in this view.</div>
        ) : (
          shown.map((o) => <OrderRow key={o.id} order={o} market={market} onOpen={onOpen} onReorder={onReorder} />)
        )}
      </div>
    </div>
  );
}

function AddressesView() {
  const [addresses, setAddresses] = React.useState<SavedAddress[]>([]);
  const [loading, setLoading] = React.useState(true);
  // A failed fetch used to silently fall back to a fabricated demo address
  // list with fake ids ("0","1","2") that looked editable but didn't reflect
  // real backend state (remaining-surfaces audit #16). Show an explicit
  // error + retry instead.
  const [loadError, setLoadError] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [newAddr, setNewAddr] = React.useState({ label: "", line1: "", line2: "", city: "", country: "LK", postalCode: "" });
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    setLoadError(false);
    getAddresses()
      .then(({ addresses: a }) => setAddresses(a))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const addAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { address } = await createAddress({ ...newAddr, isDefault: addresses.length === 0 });
      setAddresses((prev) => [...prev, address]);
      setShowForm(false);
      setNewAddr({ label: "", line1: "", line2: "", city: "", country: "LK", postalCode: "" });
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const removeAddress = async (id: string) => {
    try {
      await deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch { /* ignore */ }
  };

  const fieldStyle = { width: "100%", boxSizing: "border-box" as const, fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", background: "#fff", outline: "none" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 className="disp" style={{ fontSize: 36, color: "var(--brand)", margin: 0, lineHeight: 1.05 }}>Saved addresses</h1>
        <button onClick={() => setShowForm((v) => !v)} className="btn btn-ghost" style={{ width: "auto", padding: "11px 18px", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          Add address
        </button>
      </div>

      {showForm && (
        <form onSubmit={addAddress} style={{ background: "#FFFDF9", border: "1.5px solid var(--brand)", borderRadius: 12, padding: "22px 24px", marginBottom: 20 }}>
          <h3 className="disp" style={{ fontSize: 22, color: "var(--brand)", margin: "0 0 16px" }}>New address</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <label><span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 5 }}>Label (optional)</span><input style={fieldStyle} placeholder="Home, Office…" value={newAddr.label} onChange={(e) => setNewAddr((p) => ({ ...p, label: e.target.value }))} /></label>
            <label><span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 5 }}>Country</span><input style={fieldStyle} value={newAddr.country} onChange={(e) => setNewAddr((p) => ({ ...p, country: e.target.value.toUpperCase().slice(0, 2) }))} maxLength={2} /></label>
          </div>
          <div style={{ display: "grid", gap: 12, marginBottom: 12 }}>
            <label><span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 5 }}>Address line 1 *</span><input required style={fieldStyle} value={newAddr.line1} onChange={(e) => setNewAddr((p) => ({ ...p, line1: e.target.value }))} /></label>
            <label><span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 5 }}>Address line 2</span><input style={fieldStyle} value={newAddr.line2} onChange={(e) => setNewAddr((p) => ({ ...p, line2: e.target.value }))} /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <label><span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 5 }}>City *</span><input required style={fieldStyle} value={newAddr.city} onChange={(e) => setNewAddr((p) => ({ ...p, city: e.target.value }))} /></label>
            <label><span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 5 }}>Postal code</span><input style={fieldStyle} value={newAddr.postalCode} onChange={(e) => setNewAddr((p) => ({ ...p, postalCode: e.target.value }))} /></label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="btn btn-local" style={{ width: "auto", padding: "11px 20px", fontSize: 14, opacity: saving ? 0.6 : 1 }} disabled={saving}>{saving ? "Saving…" : "Save address"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost" style={{ width: "auto", padding: "11px 20px", fontSize: 14 }}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", padding: "24px 0" }}>Loading addresses…</div>
      ) : loadError ? (
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", padding: "24px 0" }}>
          Couldn&rsquo;t load your saved addresses.{" "}
          <button type="button" onClick={load} style={{ background: "none", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--brand)", textDecoration: "underline", textUnderlineOffset: 3, padding: 0 }}>Try again</button>
        </div>
      ) : addresses.length === 0 ? (
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", padding: "24px 0" }}>No saved addresses yet. Add one above.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {addresses.map((a) => (
            <div key={a.id} style={{ background: "#FFFDF9", border: a.isDefault ? "1.5px solid var(--brand)" : "1px solid var(--line)", borderRadius: 12, padding: "20px 22px", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span className="eyebrow" style={{ color: "var(--brand)" }}>{a.label || "Address"}</span>
                {a.isDefault && <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#fff", background: "var(--brand)", borderRadius: 999, padding: "3px 8px" }}>Default</span>}
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
                <div>{a.line1}</div>
                {a.line2 && <div>{a.line2}</div>}
                <div>{a.city}{a.postalCode ? `, ${a.postalCode}` : ""}</div>
                <div>{a.country}</div>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                <button onClick={() => removeAddress(a.id)} style={{ background: "none", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--muted)", padding: 0 }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 6 }}>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 14px", background: "#fff", outline: "none" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--brand)")} onBlur={(e) => (e.target.style.borderColor = "var(--line)")} />
    </label>
  );
}

function ProfileView({ market, userName, userEmail, userPhone, userNewsletterOptIn }: { market: Market; userName: string; userEmail: string; userPhone: string; userNewsletterOptIn: boolean }) {
  const parts = userName.split(" ");
  const [firstName, setFirstName] = React.useState(parts[0] || "");
  const [lastName, setLastName] = React.useState(parts.slice(1).join(" "));
  const [phone, setPhone] = React.useState(userPhone);
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = React.useState(userNewsletterOptIn);
  const [newsletterSaving, setNewsletterSaving] = React.useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await patchMe({ name: [firstName, lastName].filter(Boolean).join(" "), phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore — demo / offline */ } finally {
      setSaving(false);
    }
  };

  const toggleNewsletter = async () => {
    const next = !newsletterOptIn;
    setNewsletterOptIn(next); // optimistic
    setNewsletterSaving(true);
    try {
      await patchMe({ newsletterOptIn: next });
    } catch {
      setNewsletterOptIn(!next); // revert on failure
    } finally {
      setNewsletterSaving(false);
    }
  };

  const fieldStyle = { width: "100%", boxSizing: "border-box" as const, fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 14px", background: "#fff", outline: "none" };
  const labelStyle = { fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 700 as const, letterSpacing: ".06em", textTransform: "uppercase" as const, color: "var(--muted)", display: "block" as const, marginBottom: 6 };

  return (
    <div style={{ maxWidth: 620 }}>
      <h1 className="disp" style={{ fontSize: 36, color: "var(--brand)", margin: "0 0 20px", lineHeight: 1.05 }}>Profile &amp; settings</h1>
      <form onSubmit={saveProfile}>
      <div style={{ background: "#FFFDF9", border: "1px solid var(--line)", borderRadius: 14, padding: "26px 28px", marginBottom: 18 }}>
        <h2 className="disp" style={{ fontSize: 23, color: "var(--ink)", margin: "0 0 18px" }}>Personal details</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <label><span style={labelStyle}>First name</span><input style={fieldStyle} value={firstName} onChange={(e) => setFirstName(e.target.value)} onFocus={(e) => (e.target.style.borderColor = "var(--brand)")} onBlur={(e) => (e.target.style.borderColor = "var(--line)")} /></label>
          <label><span style={labelStyle}>Last name</span><input style={fieldStyle} value={lastName} onChange={(e) => setLastName(e.target.value)} onFocus={(e) => (e.target.style.borderColor = "var(--brand)")} onBlur={(e) => (e.target.style.borderColor = "var(--line)")} /></label>
          <div style={{ gridColumn: "1 / -1" }}><label><span style={labelStyle}>Email</span><input style={{ ...fieldStyle, background: "var(--surface)" }} value={userEmail} readOnly type="email" /></label></div>
          <div style={{ gridColumn: "1 / -1" }}><ProfileField label="Phone" value={phone} onChange={setPhone} type="tel" /></div>
        </div>
        <button type="submit" className={market === "local" ? "btn btn-local" : "btn btn-intl"} style={{ width: "auto", padding: "12px 24px", marginTop: 20, opacity: saving ? 0.6 : 1 }} disabled={saving}>
          {saved ? "Saved ✓" : saving ? "Saving…" : "Save changes"}
        </button>
      </div>
      </form>
      <div style={{ background: "#FFFDF9", border: "1px solid var(--line)", borderRadius: 14, padding: "26px 28px", marginBottom: 18, opacity: 0.6 }}>
        <h2 className="disp" style={{ fontSize: 23, color: "var(--ink)", margin: "0 0 6px" }}>Password</h2>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", margin: "0 0 0" }}>Password changes are not yet available. Use &ldquo;Forgot password&rdquo; on the sign-in screen to reset.</p>
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h3 className="disp" style={{ fontSize: 21, color: "var(--ink)", margin: "0 0 4px" }}>The Harvest List</h3>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", margin: 0 }}>Notes on new lots &amp; recipes. {newsletterOptIn ? "You’re subscribed." : "You’re unsubscribed."}</p>
        </div>
        <button type="button" onClick={toggleNewsletter} disabled={newsletterSaving} aria-pressed={newsletterOptIn} aria-label="Toggle Harvest List subscription" style={{ width: 44, height: 26, borderRadius: 999, background: newsletterOptIn ? "var(--brand)" : "var(--line)", position: "relative", border: 0, padding: 0, cursor: newsletterSaving ? "default" : "pointer", opacity: newsletterSaving ? 0.7 : 1, flex: "0 0 auto" }}>
          <span style={{ position: "absolute", top: 3, left: newsletterOptIn ? 21 : 3, width: 20, height: 20, borderRadius: 999, background: "#fff", transition: "left .15s" }} />
        </button>
      </div>
    </div>
  );
}

function WishlistView({ market, items, loading, onRemove }: { market: Market; items: WishlistItem[] | null; loading: boolean; onRemove: (productId: string) => void }) {
  const remove = async (productId: string) => {
    try {
      await removeFromWishlist(productId);
      onRemove(productId);
    } catch { /* ignore */ }
  };

  // Fallback to demo data if backend unavailable
  const demoItems = wishlistSpices(ACCOUNT.wishlistKeys);

  return (
    <div>
      <h1 className="disp" style={{ fontSize: 36, color: "var(--brand)", margin: "0 0 6px", lineHeight: 1.05 }}>Your wishlist</h1>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--muted)", margin: "0 0 24px" }}>Spices you&rsquo;ve saved for later — add them to a future harvest box.</p>
      {loading ? (
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)" }}>Loading wishlist…</div>
      ) : items !== null ? (
        items.length === 0 ? (
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", padding: "24px 0" }}>Your wishlist is empty. Browse the store to save favourites.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 22 }}>
            {items.map((wi) => {
              const spice = { name: wi.product.name, latin: wi.product.latin || "", origin: "Sri Lanka", color: wi.product.color || "#6b5d4b", base: wi.product.color || "#6b5d4b", deep: wi.product.color || "#6b5d4b", surface: "#FDFAF5", rating: 4.8, reviews: 0, badge: "In Stock", usd: "$" + (Number(wi.product.variants?.[0]?.price) || 0).toFixed(2), lkr: "Rs " + (Number(wi.product.variants?.[0]?.price) || 0).toLocaleString("en-US"), weights: ["50g", "100g", "250g"], slug: wi.product.slug };
              return (
                <div key={wi.id} style={{ position: "relative" }}>
                  <CardCFinal spice={spice} market={market} />
                  <button onClick={() => remove(wi.productId)} style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,253,249,.9)", border: "1px solid var(--line)", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>Remove</button>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 22 }}>
          {demoItems.map((s) => <CardCFinal key={s.name} spice={s} market={market} />)}
        </div>
      )}
    </div>
  );
}

export function AccountDashboard() {
  const { market } = useMarket();
  const cart = useCart();
  const { user, demo, signOut } = useAuth();
  const [view, setView] = React.useState<View>("overview");
  const [openOrder, setOpenOrder] = React.useState<string | null>(null);
  // Authenticated users start with an empty list; demo users get demo orders.
  const [orders, setOrders] = React.useState<AccountOrder[]>(demo ? ACCOUNT.orders : []);
  const [ordersLoading, setOrdersLoading] = React.useState(!demo);

  React.useEffect(() => {
    if (demo) return; // demo mode — keep demo orders
    listOrders()
      .then(({ orders: apiOrders }) => {
        setOrders(apiOrders?.length ? apiOrders.map(toAccountOrder) : []);
      })
      .catch(() => { /* empty list on error */ })
      .finally(() => setOrdersLoading(false));
  }, [demo]);

  // Lifted here (not just inside WishlistView) so the overview's "Saved
  // spices" stat tile shows the SAME real count instead of the fabricated
  // demo number it used to read (remaining-surfaces audit #13).
  const [wishlist, setWishlist] = React.useState<WishlistItem[] | null>(null);
  const [wishlistLoading, setWishlistLoading] = React.useState(!demo);

  React.useEffect(() => {
    if (demo) { setWishlistLoading(false); return; }
    getWishlist()
      .then(({ items }) => setWishlist(items))
      .catch(() => setWishlist(null))
      .finally(() => setWishlistLoading(false));
  }, [demo]);

  const wishlistCount = demo ? ACCOUNT.wishlistKeys.length : (wishlist?.length ?? 0);

  const baseActive = orders.find((o) => o.status !== "delivered") || orders[0];
  const activeOrder = orders.find((o) => o.id === (baseActive?.id ?? ""));

  const open = (o: AccountOrder) => { setOpenOrder(o.id); setView("detail"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const reorder = (o: AccountOrder) => {
    o.items.forEach((it) => {
      const staticBase = ACCOUNT_SPICES[it.key];
      const spice = {
        name: staticBase?.name ?? it.name,
        latin: staticBase?.latin ?? "",
        origin: "Sri Lanka",
        color: it.color,
        base: it.base,
        deep: it.deep,
        surface: it.surface,
        rating: 4.8,
        reviews: 120,
        badge: "In Stock" as const,
        usd: "$" + it.usd.toFixed(2),
        lkr: "Rs " + it.lkr.toLocaleString("en-US"),
        weights: ["50g", "100g", "250g"],
        slug: it.key,
      };
      cart.add(spice, it.weight, it.form, it.qty, it.backendIds);
    });
    cart.openCart();
  };

  const detailOrder = orders.find((o) => o.id === openOrder);
  // Real orders carry the shipping snapshot directly (remaining-surfaces audit
  // #5); only demo orders fall back to the demo address book by id.
  const addr = detailOrder ? (detailOrder.shippingAddress ?? ACCOUNT.addresses.find((a) => a.id === detailOrder.shipTo) ?? null) : null;
  const userName = user?.name || ACCOUNT.user.name;
  const firstName = userName.split(" ")[0];

  return (
    <div data-screen-label="Account" style={{ paddingTop: 96, background: "var(--bg)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "34px 40px 90px" }}>
        <div className="ac-shell" style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
          <Sidebar view={view} setView={(v) => { setView(v); setOpenOrder(null); }} onSignOut={signOut} userName={userName} />
          <main style={{ flex: 1, minWidth: 0 }}>
            {view === "overview" && (
              ordersLoading
                ? <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", padding: "40px 0" }}>Loading your orders…</div>
                : <OverviewView market={market} activeOrder={activeOrder} orders={orders} wishlistCount={wishlistCount} onOpen={open} onReorder={reorder} setView={setView} firstName={firstName} />
            )}
            {view === "orders" && (
              ordersLoading
                ? <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", padding: "40px 0" }}>Loading your orders…</div>
                : <OrdersView market={market} orders={orders} onOpen={open} onReorder={reorder} />
            )}
            {view === "detail" && detailOrder && <OrderDetailView order={detailOrder} market={market} address={addr} onBack={() => { setView("orders"); setOpenOrder(null); }} onReorder={reorder} />}
            {view === "addresses" && <AddressesView />}
            {view === "wishlist" && <WishlistView market={market} items={wishlist} loading={wishlistLoading} onRemove={(productId) => setWishlist((prev) => prev ? prev.filter((i) => i.productId !== productId) : prev)} />}
            {view === "profile" && <ProfileView market={market} userName={userName} userEmail={user?.email || ACCOUNT.user.email} userPhone={user?.phone ?? ""} userNewsletterOptIn={user?.newsletterOptIn ?? true} />}
          </main>
        </div>
      </div>
    </div>
  );
}
