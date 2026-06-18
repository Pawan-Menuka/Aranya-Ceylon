/* Aranya Ceylon — order-tracking UI.
   Depends on shared.jsx (SpicePhoto, Icon, Seal), account-data.js helpers.
   Exports: StatusPill, TrackingSummary, TrackingTimeline, OrderDetailView, OrderLine. */
const { useState: tkUse } = React;

/* tone → colours for status pills + timeline accents */
function _tone(tone) {
  if (tone === "forest") return { fg: "#0F6E56", bg: "rgba(15,110,86,.10)", dot: "#1D9E75", line: "rgba(15,110,86,.22)" };
  if (tone === "amber")  return { fg: "#9A5E11", bg: "rgba(186,117,23,.12)", dot: "#BA7517", line: "rgba(186,117,23,.24)" };
  return { fg: "#5C5248", bg: "rgba(92,82,72,.10)", dot: "#8A7F71", line: "rgba(92,82,72,.20)" }; // muted
}

/* ---- status pill ---- */
function StatusPill({ status, size = "md" }) {
  const m = acStatusMeta(status);
  const t = _tone(m.tone);
  const live = status === "in_transit" || status === "out_for_delivery";
  const pad = size === "sm" ? "4px 9px 4px 8px" : "6px 12px 6px 10px";
  const fs = size === "sm" ? 11 : 12;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: t.bg, color: t.fg,
      borderRadius: 999, padding: pad, fontFamily: "var(--font-ui)", fontSize: fs, fontWeight: 700,
      letterSpacing: ".03em", lineHeight: 1, whiteSpace: "nowrap" }}>
      <span style={{ position: "relative", width: 7, height: 7, flex: "0 0 auto" }}>
        <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: t.dot }} />
        {live && <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: t.dot, animation: "acPulse 1.8s ease-out infinite" }} />}
      </span>
      {m.label}
    </span>
  );
}

/* ---- copyable tracking number ---- */
function CopyTracking({ value, carrier }) {
  const [copied, setCopied] = tkUse(false);
  return (
    <button onClick={() => { try { navigator.clipboard.writeText(value); } catch (e) {} setCopied(true); setTimeout(() => setCopied(false), 1400); }}
      style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#fff", border: "1px solid var(--line)",
        borderRadius: 8, padding: "9px 12px", cursor: "pointer", fontFamily: "var(--font-ui)", textAlign: "left" }}>
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 10.5, letterSpacing: ".09em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>{carrier} · Tracking</span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", letterSpacing: ".02em" }}>{value}</span>
      </span>
      <span style={{ marginLeft: 4, color: copied ? "var(--brand)" : "var(--muted)", display: "grid", placeItems: "center" }}>
        {copied
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>}
      </span>
    </button>
  );
}

/* ============ Dashboard tracking summary (compact horizontal stepper) ============ */
function TrackingSummary({ order, market, onView }) {
  if (!order) return null;
  const tl = acBuildTimeline(order);
  const curIdx = tl.findIndex((s) => s.state === "active");
  const lastDone = tl.reduce((acc, s, i) => (s.state === "done" ? i : acc), -1);
  const progIdx = curIdx === -1 ? lastDone : curIdx;          // furthest reached
  const pct = (progIdx / (tl.length - 1)) * 100;
  const m = acStatusMeta(order.status);
  const accent = market === "local" ? "var(--brand)" : "var(--accent)";
  const headline = order.status === "delivered"
    ? "Delivered " + (order.deliveredLabel || "")
    : order.status === "out_for_delivery" ? "Arriving today"
    : order.status === "processing" ? "Being prepared"
    : "Arriving " + (order.etaLabel || "soon");

  return (
    <div style={{ background: "var(--brand)", color: "#FDFAF5", borderRadius: 14, overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 120% at 100% 0%, rgba(29,158,117,.45), transparent 55%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", padding: "26px 30px 30px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="eyebrow" style={{ color: "#E6B860", display: "inline-flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 22, height: 1, background: "#E6B860" }} />Active shipment
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
              <h3 className="disp" style={{ fontSize: 34, margin: 0, lineHeight: 1.08, fontWeight: 600 }}>{headline}</h3>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "rgba(253,250,245,.7)", fontWeight: 600 }}>Order {order.id}</span>
            </div>
          </div>
          <StatusPill status={order.status} />
        </div>

        {/* horizontal stepper */}
        <div style={{ marginTop: 28, position: "relative" }}>
          <div style={{ position: "absolute", left: 9, right: 9, top: 9, height: 2, background: "rgba(253,250,245,.18)", borderRadius: 999 }} />
          <div style={{ position: "absolute", left: 9, top: 9, height: 2, width: "calc(" + pct + "% * (100% - 18px) / 100%)", background: "#E6B860", borderRadius: 999, transition: "width .5s ease" }} />
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
            {tl.map((s, i) => {
              const done = s.state === "done", active = s.state === "active";
              return (
                <div key={s.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
                  <span style={{ position: "relative", width: 18, height: 18, display: "grid", placeItems: "center" }}>
                    <span style={{ width: done || active ? 18 : 11, height: done || active ? 18 : 11, borderRadius: 999,
                      background: done ? "#E6B860" : active ? "#FDFAF5" : "rgba(253,250,245,.28)",
                      border: active ? "2px solid #E6B860" : "none", display: "grid", placeItems: "center", transition: "all .3s" }}>
                      {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                      {active && <span style={{ width: 7, height: 7, borderRadius: 999, background: "#E6B860", animation: "acPulse2 1.8s ease-out infinite" }} />}
                    </span>
                  </span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, fontWeight: 600, marginTop: 9, textAlign: "center",
                    color: done || active ? "rgba(253,250,245,.95)" : "rgba(253,250,245,.5)", lineHeight: 1.25, letterSpacing: ".01em",
                    display: i === 0 || i === tl.length - 1 || active ? "block" : "block" }}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 26, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 26, flexWrap: "wrap" }}>
            <SummaryStat label={order.status === "delivered" ? "Delivered" : "Est. delivery"} value={order.status === "delivered" ? (order.deliveredLabel || "—") : (order.etaLabel || "—")} />
            <SummaryStat label="Carrier" value={order.carrier} />
            <SummaryStat label="Items" value={order.items.reduce((n, it) => n + it.qty, 0) + " jars"} />
          </div>
          <button onClick={onView} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#E6B860", color: "#1A1A1A",
            border: 0, borderRadius: 8, padding: "12px 18px", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700 }}>
            View full tracking
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
function SummaryStat({ label, value }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: ".09em", textTransform: "uppercase", color: "rgba(253,250,245,.6)", fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 700, color: "#FDFAF5", marginTop: 4 }}>{value}</div>
    </div>
  );
}

/* ============ Full vertical timeline (order detail) ============ */
function TrackingTimeline({ order }) {
  const tl = acBuildTimeline(order);
  return (
    <div style={{ position: "relative", paddingLeft: 4 }}>
      {tl.map((s, i) => {
        const done = s.state === "done", active = s.state === "active", last = i === tl.length - 1;
        const dotBg = done ? "var(--brand)" : active ? "#fff" : "#fff";
        const dotBorder = done ? "var(--brand)" : active ? "var(--accent)" : "var(--line)";
        return (
          <div key={s.key} style={{ display: "flex", gap: 18, position: "relative" }}>
            {/* rail + node */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto" }}>
              <span style={{ position: "relative", width: 26, height: 26, display: "grid", placeItems: "center", flex: "0 0 auto", marginTop: 1 }}>
                {active && <span style={{ position: "absolute", inset: -3, borderRadius: 999, background: "rgba(186,117,23,.16)", animation: "acPulse 1.8s ease-out infinite" }} />}
                <span style={{ position: "relative", width: 26, height: 26, borderRadius: 999, background: dotBg, border: "2px solid " + dotBorder,
                  display: "grid", placeItems: "center", boxSizing: "border-box" }}>
                  {done && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                  {active && <span style={{ width: 9, height: 9, borderRadius: 999, background: "var(--accent)" }} />}
                  {!done && !active && <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--line)" }} />}
                </span>
              </span>
              {!last && <span style={{ width: 2, flex: 1, minHeight: 34, background: done ? "var(--brand)" : "var(--line)", marginTop: 2, marginBottom: 2, borderRadius: 999 }} />}
            </div>
            {/* content */}
            <div style={{ paddingBottom: last ? 0 : 26, flex: 1, minWidth: 0, marginTop: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                <span className="disp" style={{ fontSize: 21, color: done || active ? "var(--ink)" : "var(--muted)", lineHeight: 1.15, fontWeight: 600, whiteSpace: "nowrap", flex: "0 0 auto" }}>
                  {s.label}{active && <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: ".06em", textTransform: "uppercase", marginLeft: 10 }}>Now</span>}
                </span>
                {s.at && <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>{s.at}</span>}
              </div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: done || active ? "var(--muted)" : "rgba(92,82,72,.6)", margin: "5px 0 0", lineHeight: 1.5 }}>{s.note}</p>
              {s.loc && <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "var(--brand)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                {s.loc}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---- order line item row (reused on detail + history expand) ---- */
function OrderLine({ item, market, compact }) {
  const price = (market === "local" ? item.lkr : item.usd) * item.qty;
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", padding: compact ? "10px 0" : "14px 0" }}>
      <div style={{ position: "relative", flex: "0 0 auto" }}>
        <div style={{ width: compact ? 46 : 56, height: compact ? 46 : 56, borderRadius: 8, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)" }}>
          <SpicePhoto spice={item} ratio="1 / 1" label={false} />
        </div>
        <span style={{ position: "absolute", top: -7, right: -7, minWidth: 19, height: 19, padding: "0 5px", background: "var(--ink)", color: "#fff", borderRadius: 999, fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center" }}>{item.qty}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="disp" style={{ fontSize: compact ? 17 : 19, color: "var(--ink)", lineHeight: 1.22, fontWeight: 600 }}>{item.name}</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", fontWeight: 600, letterSpacing: ".03em", marginTop: 7 }}>{item.weight} · {item.form}</div>
      </div>
      <span className="disp" style={{ fontSize: compact ? 18 : 20, color: "var(--ink)", fontWeight: 600, whiteSpace: "nowrap" }}>{acFmt(price, market)}</span>
    </div>
  );
}

/* ============ Order detail view (full tracking page) ============ */
function OrderDetailView({ order, market, address, onBack, onReorder }) {
  const sub = acOrderSubtotal(order, market);
  const total = acOrderTotal(order, market);
  const ship = total - sub;
  const delivered = order.status === "delivered";

  return (
    <div>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "none", border: 0, cursor: "pointer",
        fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--muted)", padding: 0, marginBottom: 20 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        All orders
      </button>

      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <StatusPill status={order.status} />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Placed {order.placedLabel}</span>
          </div>
          <h1 className="disp" style={{ fontSize: 40, color: "var(--brand)", margin: 0, lineHeight: 1.05, whiteSpace: "nowrap" }}>Order {order.id}</h1>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => onReorder(order)} className={market === "local" ? "btn btn-local" : "btn btn-intl"} style={{ width: "auto", padding: "12px 20px" }}>Reorder these spices</button>
          <button style={{ width: "auto", padding: "12px 18px", background: "transparent", border: "1.5px solid var(--brand)", color: "var(--brand)", borderRadius: "var(--radius)", cursor: "pointer", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            Invoice
          </button>
        </div>
      </div>

      <div className="ac-detail-cols" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: 28, alignItems: "start", marginTop: 26 }}>
        {/* left: tracking */}
        <div style={{ background: "#FFFDF9", border: "1px solid var(--line)", borderRadius: 14, padding: "26px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
            <h2 className="disp" style={{ fontSize: 25, color: "var(--ink)", margin: 0, whiteSpace: "nowrap" }}>{delivered ? "Delivery history" : "Live tracking"}</h2>
            <CopyTracking value={order.tracking} carrier={order.carrier} />
          </div>
          {!delivered && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(15,110,86,.06)", border: "1px solid rgba(15,110,86,.16)", borderRadius: 10, padding: "13px 16px", marginBottom: 24 }}>
              <span style={{ width: 38, height: 38, borderRadius: 999, background: "var(--brand)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1.5" /><path d="M16 8h4l3 3v5h-7z" /><circle cx="5.5" cy="18.5" r="2" /><circle cx="18.5" cy="18.5" r="2" /></svg>
              </span>
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>Estimated delivery {order.etaLabel}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>Tracked & insured via {order.carrier}.</div>
              </div>
            </div>
          )}
          <TrackingTimeline order={order} />
        </div>

        {/* right: summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "22px 24px" }}>
            <h3 className="disp" style={{ fontSize: 22, color: "var(--ink)", margin: "0 0 4px" }}>{order.items.reduce((n, it) => n + it.qty, 0)} items</h3>
            <div style={{ borderTop: "1px solid var(--line)", marginTop: 12 }}>
              {order.items.map((it) => <div key={it.key} style={{ borderBottom: "1px solid var(--line)" }}><OrderLine item={it} market={market} /></div>)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
              <DetailRow label="Subtotal" val={acFmt(sub, market)} />
              <DetailRow label="Shipping" val={ship === 0 ? "Free" : acFmt(ship, market)} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
              <span className="disp" style={{ fontSize: 20, color: "var(--ink)", fontWeight: 600 }}>Total</span>
              <span className="disp" style={{ fontSize: 27, color: "var(--ink)", fontWeight: 600 }}>{acFmt(total, market)}</span>
            </div>
          </div>

          {address && (
            <div style={{ background: "#FFFDF9", border: "1px solid var(--line)", borderRadius: 14, padding: "20px 22px" }}>
              <div className="eyebrow" style={{ color: "var(--muted)", marginBottom: 12 }}>Shipping to · {address.label}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)", lineHeight: 1.55 }}>
                <div style={{ fontWeight: 700 }}>{address.name}</div>
                {address.lines.map((l, i) => <div key={i} style={{ color: "var(--muted)" }}>{l}</div>)}
                {address.cityzip && <div style={{ color: "var(--muted)" }}>{address.cityzip}</div>}
                <div style={{ color: "var(--muted)" }}>{address.country}</div>
                <div style={{ color: "var(--muted)", marginTop: 6 }}>{address.phone}</div>
              </div>
            </div>
          )}

          {delivered && (
            <button style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: "transparent", border: "1.5px solid var(--line)", color: "var(--muted)", borderRadius: 10, padding: "13px", cursor: "pointer", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13.5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v5M12 16h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
              Report an issue with this order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
function DetailRow({ label, val }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-ui)", fontSize: 13.5 }}>
      <span style={{ color: "var(--muted)", fontWeight: 500 }}>{label}</span>
      <span style={{ color: "var(--ink)", fontWeight: 700 }}>{val}</span>
    </div>
  );
}

Object.assign(window, { StatusPill, CopyTracking, TrackingSummary, TrackingTimeline, OrderLine, OrderDetailView });
