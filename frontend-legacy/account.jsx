/* Aranya Ceylon — Account dashboard shell.
   Depends on shared.jsx, account-data.js, account-tracking.jsx, cards.jsx (CardCFinal),
   home-common.jsx (Liyawel, Eyebrow), cart-store.js (AranyaCart).
   Exports: AccountShell, SignedOutGate. */
const { useState: acUse } = React;

/* ---------- sidebar nav ---------- */
const AC_NAV = [
  { key: "overview",  label: "Overview",  icon: "grid" },
  { key: "orders",    label: "Orders",    icon: "box" },
  { key: "addresses", label: "Addresses", icon: "pin" },
  { key: "wishlist",  label: "Wishlist",  icon: "heart" },
  { key: "profile",   label: "Profile",   icon: "user" },
];
function NavIcon({ name, stroke }) {
  const p = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    box: <><path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" /></>,
    pin: <><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
  }[name];
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p}</svg>;
}

function Sidebar({ view, setView, navStyle, onSignOut, liveUser }) {
  const base = ACCOUNT.user;
  // Overlay live API user fields when available
  const u = liveUser ? {
    ...base,
    name: liveUser.name || base.name,
    email: liveUser.email || base.email,
    initials: (liveUser.name || base.name).split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2),
    first: (liveUser.name || base.name).split(" ")[0],
  } : base;
  const pct = Math.min(100, (u.points / u.pointsTo) * 100);
  if (navStyle === "tabs") {
    return (
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--line)", marginBottom: 30, overflowX: "auto" }}>
        {AC_NAV.map((n) => {
          const on = view === n.key || (n.key === "orders" && view === "detail");
          return (
            <button key={n.key} onClick={() => setView(n.key)} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "none", border: 0,
              borderBottom: on ? "2px solid var(--brand)" : "2px solid transparent", color: on ? "var(--brand)" : "var(--muted)", cursor: "pointer",
              fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, padding: "12px 14px", marginBottom: -1, whiteSpace: "nowrap" }}>
              <NavIcon name={n.icon} stroke={on ? "var(--brand)" : "var(--muted)"} />{n.label}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <aside style={{ flex: "0 0 256px", position: "sticky", top: 96, alignSelf: "start" }}>
      {/* user card */}
      <div style={{ background: "var(--brand)", color: "#FDFAF5", borderRadius: 14, padding: "22px 22px 20px", marginBottom: 18, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 100% at 100% 0%, rgba(29,158,117,.5), transparent 55%)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <span style={{ width: 48, height: 48, borderRadius: 999, background: "rgba(253,250,245,.14)", border: "1px solid rgba(230,184,96,.5)", display: "grid", placeItems: "center", flex: "0 0 auto", fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "#E6B860" }}>{u.initials}</span>
            <div style={{ minWidth: 0 }}>
              <div className="disp" style={{ fontSize: 21, lineHeight: 1.1, fontWeight: 600 }}>{u.name}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "rgba(253,250,245,.72)", marginTop: 2 }}>Member since {u.since}</div>
            </div>
          </div>
          {/* loyalty */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(253,250,245,.16)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "#E6B860", fontWeight: 700 }}>{u.tier}</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "rgba(253,250,245,.78)", fontWeight: 600 }}>{u.points} / {u.pointsTo}</span>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: "rgba(253,250,245,.16)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: pct + "%", background: "#E6B860", borderRadius: 999 }} />
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "rgba(253,250,245,.62)", marginTop: 8 }}>{u.pointsTo - u.points} pts to a free gift box</div>
          </div>
        </div>
      </div>
      {/* nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {AC_NAV.map((n) => {
          const on = view === n.key || (n.key === "orders" && view === "detail");
          return (
            <button key={n.key} onClick={() => setView(n.key)} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left",
              background: on ? "var(--surface)" : "transparent", border: 0, borderRadius: 9, padding: "12px 14px", cursor: "pointer",
              fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: on ? 700 : 600, color: on ? "var(--brand)" : "var(--ink)",
              boxShadow: on ? "inset 3px 0 0 var(--brand)" : "none", transition: "background .15s" }}
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

/* ---------- small stat tile ---------- */
function StatTile({ label, value, sub, onClick }) {
  return (
    <button onClick={onClick} style={{ flex: "1 1 0", minWidth: 0, textAlign: "left", background: "#FFFDF9", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 20px", cursor: onClick ? "pointer" : "default" }}>
      <div className="disp" style={{ fontSize: 36, color: "var(--brand)", lineHeight: 1, fontWeight: 600 }}>{value}</div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, color: "var(--ink)", marginTop: 8 }}>{label}</div>
      {sub && <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
    </button>
  );
}

/* ---------- order history row ---------- */
function OrderRow({ order, market, onOpen, onReorder }) {
  const total = acOrderTotal(order, market);
  const n = order.items.reduce((a, it) => a + it.qty, 0);
  return (
    <div style={{ background: "#FFFDF9", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        {/* spice stack thumbnails */}
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
          <div className="disp" style={{ fontSize: 22, color: "var(--ink)", fontWeight: 600 }}>{acFmt(total, market)}</div>
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

/* ---------- views ---------- */
function OverviewView({ market, activeOrder, orders, onOpen, onReorder, setView }) {
  const u = ACCOUNT.user;
  const delivered = orders.filter((o) => o.status === "delivered").length;
  return (
    <div>
      <h1 className="disp" style={{ fontSize: 38, color: "var(--brand)", margin: "0 0 4px", lineHeight: 1.05 }}>Welcome back, {u.first}</h1>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--muted)", margin: "0 0 26px" }}>Here's what's moving in your pantry today.</p>

      {activeOrder && <div style={{ marginBottom: 24 }}><TrackingSummary order={activeOrder} market={market} onView={() => onOpen(activeOrder)} /></div>}

      <div style={{ display: "flex", gap: 14, marginBottom: 30, flexWrap: "wrap" }}>
        <StatTile value={orders.length} label="Total orders" sub={delivered + " delivered"} onClick={() => setView("orders")} />
        <StatTile value={ACCOUNT.wishlistKeys.length} label="Saved spices" sub="In your wishlist" onClick={() => setView("wishlist")} />
        <StatTile value={u.points} label="Harvest points" sub={u.tier.replace("Harvest Club · ", "")} />
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

function OrdersView({ market, orders, onOpen, onReorder }) {
  const [filter, setFilter] = acUse("all");
  const tabs = [["all", "All"], ["open", "In progress"], ["delivered", "Delivered"]];
  const shown = orders.filter((o) => filter === "all" ? true : filter === "delivered" ? o.status === "delivered" : o.status !== "delivered");
  return (
    <div>
      <h1 className="disp" style={{ fontSize: 36, color: "var(--brand)", margin: "0 0 18px", lineHeight: 1.05 }}>Your orders</h1>
      <div className="seg" style={{ marginBottom: 22 }}>
        {tabs.map(([k, l]) => <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{l}</button>)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {shown.length === 0
          ? <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", padding: "30px 0" }}>No orders in this view.</div>
          : shown.map((o) => <OrderRow key={o.id} order={o} market={market} onOpen={onOpen} onReorder={onReorder} />)}
      </div>
    </div>
  );
}

function AddressesView() {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 className="disp" style={{ fontSize: 36, color: "var(--brand)", margin: 0, lineHeight: 1.05 }}>Saved addresses</h1>
        <button className="btn btn-ghost" style={{ width: "auto", padding: "11px 18px", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          Add address
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {ACCOUNT.addresses.map((a) => (
          <div key={a.id} style={{ background: "#FFFDF9", border: a.isDefault ? "1.5px solid var(--brand)" : "1px solid var(--line)", borderRadius: 12, padding: "20px 22px", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span className="eyebrow" style={{ color: "var(--brand)", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 14, height: 2, background: a.market === "local" ? "var(--brand)" : "var(--accent)" }} />{a.label}
              </span>
              {a.isDefault && <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#fff", background: "var(--brand)", borderRadius: 999, padding: "3px 8px" }}>Default</span>}
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)", lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700 }}>{a.name}</div>
              {a.lines.map((l, i) => <div key={i} style={{ color: "var(--muted)" }}>{l}</div>)}
              {a.cityzip && <div style={{ color: "var(--muted)" }}>{a.cityzip}</div>}
              <div style={{ color: "var(--muted)" }}>{a.country}</div>
              <div style={{ color: "var(--muted)", marginTop: 6 }}>{a.phone}</div>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
              <button style={{ background: "none", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--brand)", padding: 0 }}>Edit</button>
              {!a.isDefault && <button style={{ background: "none", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--muted)", padding: 0 }}>Set default</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileField({ label, value, type = "text" }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 6 }}>{label}</span>
      <input type={type} defaultValue={value} style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 14px", background: "#fff", outline: "none" }}
        onFocus={(e) => e.target.style.borderColor = "var(--brand)"} onBlur={(e) => e.target.style.borderColor = "var(--line)"} />
    </label>
  );
}
function ProfileView({ market }) {
  const u = ACCOUNT.user;
  const [first, last] = u.name.split(" ");
  return (
    <div style={{ maxWidth: 620 }}>
      <h1 className="disp" style={{ fontSize: 36, color: "var(--brand)", margin: "0 0 20px", lineHeight: 1.05 }}>Profile & settings</h1>
      <div style={{ background: "#FFFDF9", border: "1px solid var(--line)", borderRadius: 14, padding: "26px 28px", marginBottom: 18 }}>
        <h2 className="disp" style={{ fontSize: 23, color: "var(--ink)", margin: "0 0 18px" }}>Personal details</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <ProfileField label="First name" value={first} />
          <ProfileField label="Last name" value={last} />
          <div style={{ gridColumn: "1 / -1" }}><ProfileField label="Email" value={u.email} type="email" /></div>
          <div style={{ gridColumn: "1 / -1" }}><ProfileField label="Phone" value="+1 (917) 555 0142" type="tel" /></div>
        </div>
        <button className={market === "local" ? "btn btn-local" : "btn btn-intl"} style={{ width: "auto", padding: "12px 24px", marginTop: 20 }}>Save changes</button>
      </div>
      <div style={{ background: "#FFFDF9", border: "1px solid var(--line)", borderRadius: 14, padding: "26px 28px", marginBottom: 18 }}>
        <h2 className="disp" style={{ fontSize: 23, color: "var(--ink)", margin: "0 0 18px" }}>Password</h2>
        <div style={{ display: "grid", gap: 14 }}>
          <ProfileField label="Current password" value="" type="password" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <ProfileField label="New password" value="" type="password" />
            <ProfileField label="Confirm new password" value="" type="password" />
          </div>
        </div>
        <button className="btn btn-ghost" style={{ width: "auto", padding: "12px 24px", marginTop: 20 }}>Update password</button>
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h3 className="disp" style={{ fontSize: 21, color: "var(--ink)", margin: "0 0 4px" }}>The Harvest List</h3>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", margin: 0 }}>Notes on new lots & recipes. You're subscribed.</p>
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
          <span style={{ width: 44, height: 26, borderRadius: 999, background: "var(--brand)", position: "relative", transition: "background .2s" }}>
            <span style={{ position: "absolute", top: 3, left: 21, width: 20, height: 20, borderRadius: 999, background: "#fff" }} />
          </span>
        </label>
      </div>
    </div>
  );
}

function WishlistView({ market }) {
  const items = ACCOUNT.wishlistKeys.map((k) => {
    const s = ACCOUNT_SPICES[k];
    return { ...s, rating: 4.8, reviews: 120, badge: "In Stock", usd: "$" + s.usd.toFixed(2), lkr: "Rs " + s.lkr.toLocaleString("en-US") };
  });
  return (
    <div>
      <h1 className="disp" style={{ fontSize: 36, color: "var(--brand)", margin: "0 0 6px", lineHeight: 1.05 }}>Your wishlist</h1>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--muted)", margin: "0 0 24px" }}>Spices you've saved for later — add them to a future harvest box.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 22 }}>
        {items.map((s) => <CardCFinal key={s.name} spice={s} market={market} />)}
      </div>
    </div>
  );
}

/* ---------- shell ---------- */
function AccountShell({ market, liveUser, statusOverride, navStyle, onSignOut, onReorderToast }) {
  const [view, setView] = acUse("overview");
  const [openOrder, setOpenOrder] = acUse(null);

  // active order = first non-delivered, with tweakable status applied
  const baseActive = ACCOUNT.orders.find((o) => o.status !== "delivered") || ACCOUNT.orders[0];
  const orders = ACCOUNT.orders.map((o) => o.id === baseActive.id && statusOverride ? { ...o, status: statusOverride } : o);
  const activeOrder = orders.find((o) => o.id === baseActive.id);

  const open = (o) => { setOpenOrder(o.id); setView("detail"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const reorder = (o) => {
    o.items.forEach((it) => { const base = ACCOUNT_SPICES[it.key]; if (base) window.AranyaCart.add(base, it.weight, it.form, it.qty); });
    if (onReorderToast) onReorderToast(o);
  };

  const detailOrder = orders.find((o) => o.id === openOrder);
  const addr = detailOrder ? ACCOUNT.addresses.find((a) => a.id === detailOrder.shipTo) : null;

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: navStyle === "tabs" ? "30px 40px 90px" : "34px 40px 90px" }}>
      <div className="ac-shell" style={{ display: navStyle === "tabs" ? "block" : "flex", gap: 40, alignItems: "flex-start" }}>
        <Sidebar view={view} setView={(v) => { setView(v); setOpenOrder(null); }} navStyle={navStyle} onSignOut={onSignOut} liveUser={liveUser} />
        <main className="ac-main" style={{ flex: 1, minWidth: 0 }}>
          {view === "overview"  && <OverviewView market={market} activeOrder={activeOrder} orders={orders} onOpen={open} onReorder={reorder} setView={setView} />}
          {view === "orders"    && <OrdersView market={market} orders={orders} onOpen={open} onReorder={reorder} />}
          {view === "detail"    && detailOrder && <OrderDetailView order={detailOrder} market={market} address={addr} onBack={() => { setView("orders"); setOpenOrder(null); }} onReorder={reorder} />}
          {view === "addresses" && <AddressesView />}
          {view === "wishlist"  && <WishlistView market={market} />}
          {view === "profile"   && <ProfileView market={market} />}
        </main>
      </div>
    </div>
  );
}

/* ---------- signed-out gate ---------- */
function SignedOutGate({ market, onSignIn }) {
  const [mode, setMode] = acUse("in");
  const [name, setName] = acUse("");
  const [email, setEmail] = acUse("");
  const [password, setPassword] = acUse("");
  const [loading, setLoading] = acUse(false);
  const [error, setError] = acUse(null);

  const accentBtn = market === "local" ? "btn btn-local" : "btn btn-intl";

  const switchMode = (m) => { setMode(m); setError(null); };

  const submit = async () => {
    if (!email.trim() || !password.trim()) { setError("Email and password are required."); return; }
    setLoading(true); setError(null);
    try {
      let data;
      if (mode === "in") {
        data = await window.AranyaAPI.login(email.trim(), password);
      } else {
        if (!name.trim()) { setError("Please enter your name."); setLoading(false); return; }
        data = await window.AranyaAPI.register({ name: name.trim(), email: email.trim(), password });
      }
      onSignIn(data.user || data);
    } catch (e) {
      setError((e.data && (e.data.message || e.data.error)) || e.message || "Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const field = (label, type, ph, value, onChange) => (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 6 }}>{label}</span>
      <input type={type} placeholder={ph} value={value} onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 14px", background: "#fff", outline: "none" }}
        onFocus={(e) => e.target.style.borderColor = "var(--brand)"} onBlur={(e) => e.target.style.borderColor = "var(--line)"} />
    </label>
  );

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "60px 40px 100px" }}>
      <div className="ac-gate" style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 56, alignItems: "center" }}>
        {/* left: pitch */}
        <div>
          <Eyebrow>Your account</Eyebrow>
          <h1 className="disp" style={{ fontSize: "clamp(38px,4.4vw,56px)", color: "var(--brand)", margin: "16px 0 56px", lineHeight: 1.16 }}>Track every harvest, from hill to home.</h1>
          <p className="prose" style={{ fontSize: 17, color: "var(--ink)", margin: "0 0 30px", maxWidth: 460 }}>
            Sign in to follow your shipments in real time, reorder your pantry in a tap, and keep your Harvest Club points growing.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 }}>
            {[["Live order tracking", "Watch each parcel move from our Kandy facility to your door."],
              ["One-tap reorder", "Restock favourites in seconds — same lot, same freshness."],
              ["Harvest Club rewards", "Earn points on every order toward free gift boxes."]].map((b) => (
              <div key={b[0]} style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
                <span style={{ width: 34, height: 34, borderRadius: 999, background: "rgba(15,110,86,.1)", display: "grid", placeItems: "center", flex: "0 0 auto", marginTop: 1 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                </span>
                <div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{b[0]}</div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", marginTop: 2, lineHeight: 1.5 }}>{b[1]}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 34 }}><Liyawel width={260} /></div>
        </div>
        {/* right: auth card */}
        <div style={{ background: "#FFFDF9", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow-md)", overflow: "hidden" }}>
          <div style={{ background: "var(--brand)", color: "#FDFAF5", padding: "26px 32px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 100% at 100% 0%, rgba(29,158,117,.5), transparent 55%)" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><Seal size={46} tone="light" /></div>
              <h2 className="disp" style={{ fontSize: 27, margin: 0, fontWeight: 600 }}>{mode === "in" ? "Welcome back" : "Create your account"}</h2>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "rgba(253,250,245,.78)", margin: "5px 0 0" }}>{mode === "in" ? "Sign in to track orders & reorder favourites" : "Save your details for a faster checkout"}</p>
            </div>
          </div>
          <div style={{ padding: "26px 32px 30px" }}>
            {error && <div style={{ background: "rgba(192,83,31,.08)", border: "1px solid rgba(192,83,31,.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontFamily: "var(--font-ui)", fontSize: 13, color: "#C0531F", fontWeight: 600 }}>{error}</div>}
            {mode === "up" && field("Full name", "text", "Your name", name, setName)}
            {field("Email", "email", "you@example.com", email, setEmail)}
            {field("Password", "password", "••••••••", password, setPassword)}
            {mode === "in" && <div style={{ textAlign: "right", marginTop: -6, marginBottom: 12 }}><a href="#" style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "var(--brand)" }}>Forgot password?</a></div>}
            <button className={accentBtn} onClick={submit} disabled={loading} style={{ marginTop: 4, opacity: loading ? .7 : 1 }}>
              {loading ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
            </button>
            <div style={{ textAlign: "center", marginTop: 16, fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)" }}>
              {mode === "in" ? "New to Aranya? " : "Already have an account? "}
              <button onClick={() => switchMode(mode === "in" ? "up" : "in")} style={{ background: "none", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--brand)", textDecoration: "underline", textUnderlineOffset: 3 }}>{mode === "in" ? "Create an account" : "Sign in"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AccountShell, SignedOutGate });
