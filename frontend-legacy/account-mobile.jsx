/* Aranya Ceylon — mobile account + order-tracking screens (for the iOS frame).
   Depends on shared.jsx (SpicePhoto, Seal, Icon), account-data.js, account-tracking.jsx
   (StatusPill, TrackingTimeline, CopyTracking), home-common.jsx (Liyawel).
   Exports: MSignIn, MAccountHome, MTrackingDetail. Each fills an <IOSDevice>. */
const { useState: mUse } = React;

const MPAD = 50; // clear the status bar / dynamic island

/* forest gradient header used on signed-in screens */
function MHeader({ children, pad = "18px 20px 20px" }) {
  return (
    <div style={{ background: "var(--brand)", color: "#FDFAF5", padding: pad, paddingTop: MPAD, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 100% at 100% 0%, rgba(29,158,117,.5), transparent 55%)" }} />
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

/* ---------- compact tracking summary (mobile) ---------- */
function MTrackSummary({ order, market, onOpen }) {
  const tl = acBuildTimeline(order);
  const curIdx = tl.findIndex((s) => s.state === "active");
  const lastDone = tl.reduce((a, s, i) => (s.state === "done" ? i : a), -1);
  const progIdx = curIdx === -1 ? lastDone : curIdx;
  const pct = (progIdx / (tl.length - 1)) * 100;
  const cur = tl[progIdx] || tl[0];
  const headline = order.status === "delivered" ? "Delivered" : order.status === "out_for_delivery" ? "Arriving today" : order.status === "processing" ? "Being prepared" : "Arriving " + (order.etaLabel || "soon");
  return (
    <button onClick={onOpen} style={{ display: "block", width: "100%", textAlign: "left", background: "var(--brand)", color: "#FDFAF5", border: 0, borderRadius: 16, padding: "18px 18px 20px", cursor: "pointer", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 120% at 100% 0%, rgba(29,158,117,.5), transparent 55%)" }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "#E6B860", fontWeight: 700 }}>Active shipment</span>
          <StatusPill status={order.status} size="sm" />
        </div>
        <div className="disp" style={{ fontSize: 27, fontWeight: 600, lineHeight: 1.05, marginTop: 10 }}>{headline}</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "rgba(253,250,245,.72)", marginTop: 3 }}>Order {order.id} · {order.carrier}</div>
        {/* mini dot progress */}
        <div style={{ position: "relative", margin: "18px 2px 14px" }}>
          <div style={{ position: "absolute", left: 5, right: 5, top: 5, height: 2, background: "rgba(253,250,245,.2)", borderRadius: 999 }} />
          <div style={{ position: "absolute", left: 5, top: 5, height: 2, width: "calc(" + pct + "% * (100% - 10px) / 100%)", background: "#E6B860", borderRadius: 999 }} />
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
            {tl.map((s, i) => {
              const done = s.state === "done", active = s.state === "active";
              return <span key={s.key} style={{ width: done || active ? 12 : 9, height: done || active ? 12 : 9, borderRadius: 999, background: done ? "#E6B860" : active ? "#FDFAF5" : "rgba(253,250,245,.3)", border: active ? "2px solid #E6B860" : "none", boxSizing: "border-box" }} />;
            })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "rgba(253,250,245,.92)" }}>{cur.label}{cur.loc ? " · " + cur.loc : ""}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, color: "#E6B860" }}>
            Track <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </span>
        </div>
      </div>
    </button>
  );
}

/* ---------- mobile order row ---------- */
function MOrderRow({ order, market, onOpen }) {
  const total = acOrderTotal(order, market);
  const n = order.items.reduce((a, it) => a + it.qty, 0);
  return (
    <button onClick={() => onOpen(order)} style={{ display: "flex", width: "100%", textAlign: "left", alignItems: "center", gap: 12, background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}>
      <div style={{ display: "flex", flex: "0 0 auto" }}>
        {order.items.slice(0, 3).map((it, i) => (
          <div key={it.key} style={{ width: 38, height: 38, borderRadius: 8, overflow: "hidden", border: "2px solid #fff", marginLeft: i ? -11 : 0, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)" }}>
            <SpicePhoto spice={it} ratio="1 / 1" label={false} />
          </div>
        ))}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="disp" style={{ fontSize: 17, color: "var(--ink)", fontWeight: 600, whiteSpace: "nowrap" }}>{order.id}</span>
          <StatusPill status={order.status} size="sm" />
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{n} {n === 1 ? "jar" : "jars"} · {acFmt(total, market)}</div>
      </div>
      <svg width="9" height="15" viewBox="0 0 8 14" style={{ flex: "0 0 auto" }}><path d="M1 1l6 6-6 6" stroke="var(--muted)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

/* ---------- screen: account home ---------- */
function MAccountHome({ market, activeOrder, orders, onOpen }) {
  const u = ACCOUNT.user;
  const pct = Math.min(100, (u.points / u.pointsTo) * 100);
  const quick = [["box", "Orders"], ["pin", "Addresses"], ["heart", "Wishlist"], ["user", "Profile"]];
  const qi = (name) => ({
    box: <><path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" /></>,
    pin: <><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
  }[name]);
  return (
    <div style={{ background: "var(--bg)", minHeight: "100%" }}>
      <MHeader pad="18px 20px 22px">
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <span style={{ width: 46, height: 46, borderRadius: 999, background: "rgba(253,250,245,.14)", border: "1px solid rgba(230,184,96,.5)", display: "grid", placeItems: "center", flex: "0 0 auto", fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 600, color: "#E6B860" }}>{u.initials}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "rgba(253,250,245,.7)", letterSpacing: ".02em" }}>Welcome back</div>
            <div className="disp" style={{ fontSize: 23, lineHeight: 1.05, fontWeight: 600 }}>{u.name}</div>
          </div>
        </div>
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(253,250,245,.16)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: "#E6B860", fontWeight: 700 }}>{u.tier}</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "rgba(253,250,245,.78)", fontWeight: 600 }}>{u.points} / {u.pointsTo} pts</span>
          </div>
          <div style={{ height: 5, borderRadius: 999, background: "rgba(253,250,245,.16)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: pct + "%", background: "#E6B860", borderRadius: 999 }} />
          </div>
        </div>
      </MHeader>

      <div style={{ padding: "16px 18px 30px" }}>
        {activeOrder && <MTrackSummary order={activeOrder} market={market} onOpen={() => onOpen(activeOrder)} />}

        {/* quick links */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 9, marginTop: 16 }}>
          {quick.map(([icon, label]) => (
            <div key={label} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "13px 6px", textAlign: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 6px" }}>{qi(icon)}</svg>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "var(--ink)" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* recent orders */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "24px 0 12px" }}>
          <h3 className="disp" style={{ fontSize: 21, color: "var(--ink)", margin: 0, whiteSpace: "nowrap" }}>Recent orders</h3>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, color: "var(--brand)" }}>All</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {orders.map((o) => <MOrderRow key={o.id} order={o} market={market} onOpen={onOpen} />)}
        </div>
      </div>
    </div>
  );
}

/* ---------- screen: tracking detail ---------- */
function MTrackingDetail({ order, market, onBack }) {
  const delivered = order.status === "delivered";
  const addr = ACCOUNT.addresses.find((a) => a.id === order.shipTo);
  return (
    <div style={{ background: "var(--bg)", minHeight: "100%" }}>
      <MHeader pad="16px 20px 22px">
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: 0, color: "rgba(253,250,245,.85)", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Account
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <StatusPill status={order.status} size="sm" />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "rgba(253,250,245,.7)", fontWeight: 600 }}>Placed {order.placedLabel}</span>
        </div>
        <div className="disp" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.02 }}>Order {order.id}</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "rgba(253,250,245,.78)", marginTop: 4 }}>
          {delivered ? "Delivered " + order.deliveredLabel : "Est. delivery " + order.etaLabel} · {order.carrier}
        </div>
      </MHeader>

      <div style={{ padding: "18px 18px 34px" }}>
        <div style={{ marginBottom: 18 }}><CopyTracking value={order.tracking} carrier={order.carrier} /></div>
        <h3 className="disp" style={{ fontSize: 21, color: "var(--ink)", margin: "0 0 16px" }}>{delivered ? "Delivery history" : "Live tracking"}</h3>
        <TrackingTimeline order={order} />

        {/* items */}
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: "16px 18px", marginTop: 22 }}>
          <h3 className="disp" style={{ fontSize: 19, color: "var(--ink)", margin: "0 0 6px" }}>{order.items.reduce((n, it) => n + it.qty, 0)} items</h3>
          <div style={{ borderTop: "1px solid var(--line)", marginTop: 8 }}>
            {order.items.map((it) => <div key={it.key} style={{ borderBottom: "1px solid var(--line)" }}><OrderLine item={it} market={market} compact /></div>)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14 }}>
            <span className="disp" style={{ fontSize: 18, color: "var(--ink)", fontWeight: 600 }}>Total</span>
            <span className="disp" style={{ fontSize: 24, color: "var(--ink)", fontWeight: 600 }}>{acFmt(acOrderTotal(order, market), market)}</span>
          </div>
        </div>

        {addr && (
          <div style={{ background: "var(--surface)", borderRadius: 14, padding: "16px 18px", marginTop: 14 }}>
            <div className="eyebrow" style={{ color: "var(--muted)", marginBottom: 8 }}>Shipping to · {addr.label}</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink)", lineHeight: 1.5 }}>
              <div style={{ fontWeight: 700 }}>{addr.name}</div>
              {addr.lines.map((l, i) => <div key={i} style={{ color: "var(--muted)" }}>{l}</div>)}
              <div style={{ color: "var(--muted)" }}>{addr.country}</div>
            </div>
          </div>
        )}

        <button className={market === "local" ? "btn btn-local" : "btn btn-intl"} style={{ marginTop: 16 }}>Reorder these spices</button>
      </div>
    </div>
  );
}

/* ---------- screen: sign in ---------- */
function MSignIn({ market, onSignIn }) {
  const field = (label, type, ph) => (
    <label style={{ display: "block", marginBottom: 13 }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 6 }}>{label}</span>
      <input type={type} placeholder={ph} style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 9, padding: "12px 14px", background: "#fff", outline: "none" }} />
    </label>
  );
  return (
    <div style={{ background: "var(--bg)", minHeight: "100%" }}>
      <MHeader pad="22px 24px 30px">
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Seal size={50} tone="light" /></div>
          <div className="disp" style={{ fontSize: 27, fontWeight: 600 }}>Welcome back</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "rgba(253,250,245,.78)", marginTop: 4 }}>Track orders & reorder your pantry</div>
        </div>
      </MHeader>
      <div style={{ padding: "24px 24px 30px" }}>
        {field("Email", "email", "you@example.com")}
        {field("Password", "password", "••••••••")}
        <div style={{ textAlign: "right", marginTop: -4, marginBottom: 14 }}><span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "var(--brand)" }}>Forgot password?</span></div>
        <button className={market === "local" ? "btn btn-local" : "btn btn-intl"} onClick={onSignIn}>Sign in</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>or</span>
          <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
        </div>
        <button onClick={onSignIn} style={{ width: "100%", background: "transparent", border: "1.5px solid var(--brand)", color: "var(--brand)", borderRadius: 999, padding: "13px", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700 }}>Continue as guest</button>
        <div style={{ textAlign: "center", marginTop: 20, fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)" }}>
          New here? <span style={{ fontWeight: 700, color: "var(--brand)" }}>Create an account</span>
        </div>
        <div style={{ marginTop: 26 }}><Liyawel width={200} /></div>
      </div>
    </div>
  );
}

Object.assign(window, { MSignIn, MAccountHome, MTrackingDetail, MTrackSummary, MOrderRow });
