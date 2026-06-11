/* Aranya Ceylon — ADMIN Audit log. Depends on admin-shell.jsx + window.ADMIN. Exports AdminAudit. */
const { useState: auState, useMemo: auMemo } = React;

const ACTION_META = {
  "order.refund": { icon: "refund", tone: "neg", label: "Refund" },
  "order.status": { icon: "truck", tone: "slate", label: "Order status" },
  "stock.alert": { icon: "alert", tone: "warn", label: "Stock alert" },
  "product.update": { icon: "edit", tone: "slate", label: "Product update" },
  "product.create": { icon: "plus", tone: "pos", label: "Product created" },
  "product.images": { icon: "image", tone: "slate", label: "Images" },
  "wholesale.approve": { icon: "handshake", tone: "pos", label: "Wholesale" },
  "blog.publish": { icon: "blog", tone: "pos", label: "Blog published" },
  "blog.schedule": { icon: "clock", tone: "slate", label: "Blog scheduled" },
  "auth.login": { icon: "user", tone: "slate", label: "Login" },
  "cart.expire": { icon: "orders", tone: "muted", label: "Job" },
};
const TONE = { neg: "#C0492F", warn: "#BA7517", slate: "#5E7587", pos: "#0F6E56", muted: "#988C7C" };

const AUDIT_FILTERS = [
  { key: "all", label: "All activity" },
  { key: "admin", label: "Admin actions" },
  { key: "warn", label: "Refunds & alerts" },
  { key: "job", label: "System jobs" },
];

function RoleTag({ role }) {
  const map = { ADMIN: { c: "#0F6E56", bg: "rgba(15,110,86,.1)" }, SUPERADMIN: { c: "#BA7517", bg: "rgba(186,117,23,.12)" }, JOB: { c: "#5E7587", bg: "rgba(94,117,135,.12)" } };
  const s = map[role] || map.ADMIN;
  return <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".06em", color: s.c, background: s.bg, padding: "2px 7px", borderRadius: 5 }}>{role}</span>;
}

function AdminAudit() {
  const [filter, setFilter] = auState("all");
  const [q, setQ] = auState("");
  const rows = window.ADMIN.AUDIT;

  const filtered = auMemo(() => rows.filter((r) => {
    if (filter === "admin" && r.role === "JOB") return false;
    if (filter === "warn" && r.level !== "warn") return false;
    if (filter === "job" && r.role !== "JOB") return false;
    if (q) { const s = q.toLowerCase(); if (!(r.actor + r.action + r.target + r.meta).toLowerCase().includes(s)) return false; }
    return true;
  }), [rows, filter, q]);

  // group by day (ts prefix before comma)
  const groups = auMemo(() => {
    const g = {};
    filtered.forEach((r) => { const day = r.ts.split(",")[0]; (g[day] = g[day] || []).push(r); });
    return g;
  }, [filtered]);

  return (
    <div>
      <div className="ad-pagehd">
        <div>
          <div className="ad-eyebrow">Security</div>
          <h1 className="ad-title" style={{ marginTop: 6 }}>Audit log</h1>
          <p className="ad-sub">Immutable record of every admin action and system job. Retained 24 months.</p>
        </div>
        <button className="ad-btn ad-btn-ghost ad-btn-sm"><AIcon name="download" size={15} stroke="var(--ad-muted)" />Export log</button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div className="ad-seg">
          {AUDIT_FILTERS.map((f) => <button key={f.key} className={filter === f.key ? "on" : ""} onClick={() => setFilter(f.key)}>{f.label}</button>)}
        </div>
        <div className="ad-search" style={{ marginLeft: "auto", width: 260 }}>
          <AIcon name="search" size={15} stroke="var(--ad-faint)" />
          <input placeholder="Search actor, action, target…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="ad-card" style={{ overflow: "hidden" }}>
        {Object.keys(groups).map((day) => (
          <div key={day}>
            <div style={{ padding: "10px 18px", background: "var(--ad-soft)", borderBottom: "1px solid var(--ad-line)", fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ad-faint)" }}>{day}, 2026</div>
            {groups[day].map((r, i) => {
              const m = ACTION_META[r.action] || { icon: "audit", tone: "slate", label: r.action };
              const c = TONE[m.tone];
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--ad-line)" }}>
                  <span style={{ width: 36, height: 36, borderRadius: 9, flex: "0 0 auto", display: "grid", placeItems: "center", background: c + "16" }}>
                    <AIcon name={m.icon} size={17} stroke={c} w={1.9} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700 }}>{r.target}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: c, background: c + "14", padding: "2px 7px", borderRadius: 5 }}>{m.label}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--ad-muted)", marginTop: 2 }}>{r.meta}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.actor}</div>
                      <div style={{ fontSize: 11, color: "var(--ad-faint)" }}>{r.ts.split(", ")[1]}</div>
                    </div>
                    <RoleTag role={r.role} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--ad-faint)" }}>No matching activity.</div>}
      </div>
    </div>
  );
}

Object.assign(window, { AdminAudit });
