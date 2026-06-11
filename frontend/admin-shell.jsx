/* Aranya Ceylon — ADMIN shell: icons, chart primitives, shared atoms, layout.
   Exports to window. Depends on shared.jsx (Seal) + admin-data.js (window.ADMIN). */
const { useState: asState, useEffect: asEffect, useRef: asRef, useMemo: asMemo } = React;

/* ============================ ICONS ============================ */
function AIcon({ name, size = 18, stroke = "currentColor", w = 1.7, fill = "none" }) {
  const p = {
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
    orders: <><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></>,
    products: <><path d="M20.6 13.4L13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h6.6a2 2 0 0 1 1.4.6l7.8 7.8a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.3" fill={stroke} stroke="none" /></>,
    blog: <><path d="M4 4h11l5 5v11a0 0 0 0 1 0 0H4z" /><path d="M15 4v5h5" /><path d="M8 13h8M8 17h5" /></>,
    audit: <><path d="M5 3h11l3 3v15H5z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9z" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
    cog: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
    chevron: <path d="M6 9l6 6 6-6" />,
    chevronR: <path d="M9 6l6 6-6 6" />,
    chevronL: <path d="M15 6l-6 6 6 6" />,
    up: <path d="M7 14l5-5 5 5" />,
    down: <path d="M7 10l5 5 5-5" />,
    arrowUp: <><path d="M12 19V5" /><path d="M6 11l6-6 6 6" /></>,
    arrowDown: <><path d="M12 5v14" /><path d="M6 13l6 6 6-6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    filter: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" />,
    dots: <><circle cx="5" cy="12" r="1.4" fill={stroke} stroke="none" /><circle cx="12" cy="12" r="1.4" fill={stroke} stroke="none" /><circle cx="19" cy="12" r="1.4" fill={stroke} stroke="none" /></>,
    truck: <><path d="M3 6h11v9H3z" /><path d="M14 9h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>,
    refund: <><path d="M3 8a9 9 0 1 1-1 5" /><path d="M3 4v4h4" /></>,
    alert: <><path d="M12 3l9.5 17H2.5L12 3z" /><path d="M12 10v4M12 17.5v.2" /></>,
    handshake: <><path d="M11 17l-2 2a1.4 1.4 0 0 1-2-2l4-4 2 2 3-3 4 4" /><path d="M3 12l4-4 4 1 3-2 6 5" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
    users: <><circle cx="9" cy="8" r="3.4" /><path d="M2.5 20c0-3.6 2.9-5.6 6.5-5.6S15.5 16.4 15.5 20" /><path d="M16 5a3.4 3.4 0 0 1 0 6.6M18 14.6c2.6.5 4 2.4 4 5.4" /></>,
    calendar: <><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></>,
    eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.8" /><path d="M21 16l-5-5L5 20" /></>,
    trash: <><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13h10l1-13" /></>,
    check: <path d="M5 12l5 5L20 6" />,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    external: <><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></>,
    download: <><path d="M12 3v12M7 11l5 5 5-5" /><path d="M4 20h16" /></>,
    money: <><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9v6M18 9v6" /></>,
    box: <><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /></>,
    tag: <><path d="M20.6 13.4L13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h6.6a2 2 0 0 1 1.4.6l7.8 7.8a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.3" /></>,
    star: <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 18l-6 3.4 1.4-6.8L2.3 9.9l6.9-.8z" />,
    pin: <><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" /><circle cx="12" cy="10" r="2.6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
    menu: <><path d="M3 6h18M3 12h18M3 18h18" /></>,
    edit: <><path d="M4 20h4l10-10-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></>,
  }[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={w}
      strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>{p}</svg>
  );
}

/* ============================ CHARTS ============================ */
/* Revenue area+line chart. data: [{label, value}]. */
function AreaChart({ data, height = 220, stroke = "#0F6E56", fill = "#0F6E56", accent = "#BA7517",
  showGrid = true, valuePrefix = "$", compact = false }) {
  const W = 760, H = height, padL = compact ? 8 : 46, padR = 10, padT = 14, padB = 26;
  const xs = data.map((d) => d.value);
  const max = Math.max(...xs) * 1.12, min = 0;
  const iw = W - padL - padR, ih = H - padT - padB;
  const x = (i) => padL + (i / (data.length - 1)) * iw;
  const y = (v) => padT + ih - ((v - min) / (max - min)) * ih;
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)},${(padT + ih).toFixed(1)} L${padL},${(padT + ih).toFixed(1)} Z`;
  const gid = "ag" + asMemo(() => Math.random().toString(36).slice(2), []);
  const ticks = compact ? [] : [0, 0.5, 1].map((t) => Math.round(max * t));
  const lastI = data.length - 1;
  const fmtTick = (v) => v >= 1000 ? valuePrefix + (v / 1000).toFixed(0) + "k" : valuePrefix + v;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.20" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {showGrid && ticks.map((t, i) => {
        const yy = y(t);
        return <g key={i}>
          <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="#EBE4D7" strokeWidth="1" />
          <text x={padL - 8} y={yy + 3.5} textAnchor="end" fontFamily="var(--font-ui)" fontSize="10" fontWeight="600" fill="#988C7C">{fmtTick(t)}</text>
        </g>;
      })}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(lastI)} cy={y(data[lastI].value)} r="4.5" fill="#fff" stroke={accent} strokeWidth="2.4" />
      {!compact && data.map((d, i) => (i % Math.ceil(data.length / 7) === 0 || i === lastI) && (
        <text key={i} x={x(i)} y={H - 7} textAnchor={i === lastI ? "end" : i === 0 ? "start" : "middle"}
          fontFamily="var(--font-ui)" fontSize="10" fontWeight="600" fill="#988C7C">{d.label}</text>
      ))}
    </svg>
  );
}

/* Sparkline */
function Spark({ data, width = 92, height = 30, stroke = "#0F6E56", fillTone = true }) {
  const max = Math.max(...data), min = Math.min(...data);
  const x = (i) => (i / (data.length - 1)) * width;
  const y = (v) => height - 2 - ((v - min) / Math.max(1, max - min)) * (height - 4);
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d).toFixed(1)}`).join(" ");
  const gid = "sp" + asMemo(() => Math.random().toString(36).slice(2), []);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={stroke} stopOpacity=".22" /><stop offset="100%" stopColor={stroke} stopOpacity="0" /></linearGradient></defs>
      {fillTone && <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Donut for market split. segs:[{value,color,label}] */
function Donut({ segs, size = 132, thickness = 18, centerTop, centerSub }) {
  const r = (size - thickness) / 2, c = size / 2, circ = 2 * Math.PI * r;
  const total = segs.reduce((a, s) => a + s.value, 0);
  let acc = 0;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="#EFE9DD" strokeWidth={thickness} />
        {segs.map((s, i) => {
          const len = (s.value / total) * circ;
          const el = <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
            strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-acc} strokeLinecap="butt" />;
          acc += len; return el;
        })}
      </svg>
      {centerTop != null && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
          <div>
            <div className="disp" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, color: "var(--ad-ink)" }}>{centerTop}</div>
            {centerSub && <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ad-faint)", marginTop: 4 }}>{centerSub}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* Horizontal share bar */
function ShareBar({ value, color, track = "#EFE9DD", h = 7 }) {
  return <div style={{ height: h, borderRadius: 999, background: track, overflow: "hidden", flex: 1 }}>
    <div style={{ height: "100%", width: value + "%", background: color, borderRadius: 999 }} />
  </div>;
}

/* ============================ ATOMS ============================ */
function Delta({ value, suffix = "%", invert = false }) {
  const up = value >= 0;
  const good = invert ? !up : up;
  return (
    <span className={"delta " + (Math.abs(value) < 0.05 ? "flat" : good ? "up" : "down")}>
      <AIcon name={up ? "arrowUp" : "arrowDown"} size={13} w={2.4} />
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

function Pill({ status }) {
  return <span className={"pill " + status}><span className="pd" />{status}</span>;
}

function MarketTag({ market }) {
  return <span className={"mkt " + market}>{market === "intl" ? "USD" : "LKR"}</span>;
}

function Avatar({ name, color }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const palette = ["#0F6E56", "#BA7517", "#5E7587", "#7C9A5A", "#B5651D", "#7A4A2A"];
  const bg = color || palette[(name.charCodeAt(0) + name.length) % palette.length];
  return <span className="av" style={{ background: bg }}>{initials}</span>;
}

function Swatch({ p, size = 30 }) {
  return <span className="swatch" style={{ width: size, height: size, background:
    `radial-gradient(70% 70% at 50% 35%, ${p.base} 0%, ${p.deep} 95%)` }} />;
}

function SectionCard({ title, action, children, pad = true, style, bodyStyle }) {
  return (
    <div className="ad-card" style={style}>
      {(title || action) && (
        <div className="ad-card-h">
          <div className="ad-card-t">{title}</div>
          {action}
        </div>
      )}
      <div style={{ ...(pad ? { padding: 18 } : null), ...bodyStyle }}>{children}</div>
    </div>
  );
}

/* StatCard with optional sparkline */
function StatCard({ label, icon, value, delta, deltaInvert, spark, sparkColor = "#0F6E56", accentBar, big = false, sub }) {
  return (
    <div className="stat">
      {accentBar && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: accentBar }} />}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div className="lab">{icon && <AIcon name={icon} size={14} stroke="var(--ad-faint)" w={1.9} />}{label}</div>
        {delta != null && <Delta value={delta} invert={deltaInvert} />}
      </div>
      <div className={"val" + (big ? "" : " sm")}>{value}</div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: spark ? 6 : 0, gap: 8 }}>
        {sub && <div style={{ fontSize: 12, color: "var(--ad-muted)", fontWeight: 500 }}>{sub}</div>}
        {spark && <div style={{ marginLeft: "auto" }}><Spark data={spark} stroke={sparkColor} /></div>}
      </div>
    </div>
  );
}

/* ============================ SHELL ============================ */
const AD_NAV = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "orders", label: "Orders", icon: "orders", count: 18, hot: true },
  { key: "products", label: "Products", icon: "products" },
  { key: "blog", label: "Blog", icon: "blog" },
  { key: "audit", label: "Audit log", icon: "audit" },
];

function AdminShell({ route, setRoute, search, setSearch, children, pendingCount = 18 }) {
  const [railOpen, setRailOpen] = asState(false);
  const u = window.ADMIN.user;
  return (
    <div className="admin">
      <div className="ad-shell">
        {/* ---------- sidebar rail ---------- */}
        <aside className={"ad-rail" + (railOpen ? " open" : "")}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "20px 20px 18px", borderBottom: "1px solid var(--ad-rail-line)" }}>
            <Seal size={38} tone="light" />
            <div style={{ lineHeight: 1 }}>
              <div className="disp" style={{ fontSize: 21, color: "#FDFAF5", letterSpacing: ".01em" }}>Aranya</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 8.5, letterSpacing: ".26em", color: "#E6B860", fontWeight: 700, textTransform: "uppercase", marginTop: 3 }}>Admin Console</div>
            </div>
          </div>
          <div className="ad-navsec">Operations</div>
          <nav className="ad-nav">
            {AD_NAV.map((n) => (
              <button key={n.key} className={"ad-navitem" + (route === n.key ? " on" : "")} onClick={() => { setRoute(n.key); setRailOpen(false); }}>
                <AIcon name={n.icon} size={18} stroke={route === n.key ? "#fff" : "rgba(253,250,245,.7)"} w={1.8} />
                {n.label}
                {n.count != null && <span className={"cnt" + (n.hot ? " hot" : "")}>{n.key === "orders" ? pendingCount : n.count}</span>}
              </button>
            ))}
          </nav>
          <div className="ad-navsec">Account</div>
          <nav className="ad-nav">
            <button className="ad-navitem"><AIcon name="cog" size={18} stroke="rgba(253,250,245,.7)" w={1.7} />Settings</button>
            <button className="ad-navitem"><AIcon name="logout" size={18} stroke="rgba(253,250,245,.7)" w={1.8} />Sign out</button>
          </nav>
          <div style={{ marginTop: "auto", padding: 14, borderTop: "1px solid var(--ad-rail-line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 8px", borderRadius: 10, background: "rgba(253,250,245,.06)" }}>
              <span className="av" style={{ width: 34, height: 34, background: "#E6B860", color: "#1A1A1A", fontSize: 12 }}>{u.initials}</span>
              <div style={{ lineHeight: 1.3, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#FDFAF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</div>
                <div style={{ fontSize: 10.5, color: "rgba(253,250,245,.6)", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 9, background: "#1D9E75" }} />{u.access} · {u.role}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ---------- main ---------- */}
        <div className="ad-main">
          <header className="ad-top">
            <button className="ad-iconbtn" style={{ display: "none" }} id="ad-burger" onClick={() => setRailOpen((o) => !o)}><AIcon name="menu" size={18} /></button>
            <div className="ad-search">
              <AIcon name="search" size={16} stroke="var(--ad-faint)" />
              <input placeholder="Search orders, products, customers…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ad-faint)", border: "1px solid var(--ad-line)", borderRadius: 5, padding: "1px 6px" }}>⌘K</span>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
              <a href="Home.html" className="ad-btn ad-btn-ghost ad-btn-sm" style={{ textDecoration: "none" }}>
                <AIcon name="external" size={15} stroke="var(--ad-muted)" />View store
              </a>
              <button className="ad-iconbtn"><AIcon name="bell" size={18} stroke="var(--ad-muted)" /><span className="ad-dot">4</span></button>
              <button className="ad-iconbtn"><AIcon name="cog" size={18} stroke="var(--ad-muted)" /></button>
            </div>
          </header>
          <main className="ad-body">{children}</main>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AIcon, AreaChart, Spark, Donut, ShareBar, Delta, Pill, MarketTag, Avatar, Swatch, SectionCard, StatCard, AdminShell, AD_NAV });
