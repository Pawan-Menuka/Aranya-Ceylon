"use client";

import * as React from "react";
import { ADMIN, type AuditRow } from "@/lib/admin-data";
import { AIcon, RoleTag } from "./AdminPrimitives";
import { listAuditLogs, type AuditEntry } from "@/lib/api/admin";
import { exportCsv } from "@/lib/csv";
import { DEMO_MODE } from "@/lib/demo";

function backendAuditToRow(log: AuditEntry): AuditRow {
  const eventMap: Record<string, string> = {
    ORDER_REFUND: "order.refund", ORDER_STATUS: "order.status",
    BLOG_PUBLISH: "blog.publish", BLOG_DELETE: "blog.schedule",
    PRODUCT_CREATE: "product.create", PRODUCT_UPDATE: "product.update",
  };
  const d = new Date(log.createdAt);
  return {
    ts: d.toLocaleDateString("en-GB", { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    actor: log.actor?.name ?? log.actorId ?? "System",
    role: log.actorRole ?? "ADMIN",
    action: eventMap[log.event] ?? log.event.toLowerCase().replace(/_/g, "."),
    target: log.targetType && log.targetId ? `${log.targetType} #${log.targetId.slice(-6)}` : log.targetType ?? "—",
    meta: typeof log.meta === "object" ? JSON.stringify(log.meta ?? {}).slice(0, 80) : String(log.meta ?? ""),
    level: ["ORDER_REFUND", "PRODUCT_DELETE"].includes(log.event) ? "warn" : "info",
  };
}

// Aranya Ceylon — ADMIN Audit log (ported from admin-audit.jsx).
// Immutable, grouped-by-day action record. Reads from /admin/audit when online.

const ACTION_META: Record<string, { icon: string; tone: string; label: string }> = {
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
const TONE: Record<string, string> = { neg: "#C0492F", warn: "#BA7517", slate: "#5E7587", pos: "#0F6E56", muted: "#988C7C" };

const AUDIT_FILTERS = [
  { key: "all", label: "All activity" },
  { key: "admin", label: "Admin actions" },
  { key: "warn", label: "Refunds & alerts" },
  { key: "job", label: "System jobs" },
];

export function AdminAudit() {
  const [filter, setFilter] = React.useState("all");
  const [q, setQ] = React.useState("");
  // Demo rows only in demo mode (BUG-20).
  const [rows, setRows] = React.useState<AuditRow[]>(DEMO_MODE ? ADMIN.AUDIT : []);

  React.useEffect(() => {
    listAuditLogs({ limit: 100 }).then(({ logs }) => {
      setRows(logs?.map(backendAuditToRow) ?? []);
    }).catch(() => { /* fetch failed — keep whatever's there (demo only in demo mode) */ });
  }, []);

  const filtered = React.useMemo(() => rows.filter((r) => {
    if (filter === "admin" && r.role === "JOB") return false;
    if (filter === "warn" && r.level !== "warn") return false;
    if (filter === "job" && r.role !== "JOB") return false;
    if (q) { const s = q.toLowerCase(); if (!(r.actor + r.action + r.target + r.meta).toLowerCase().includes(s)) return false; }
    return true;
  }), [rows, filter, q]);

  const groups = React.useMemo(() => {
    const g: Record<string, typeof rows> = {};
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
        <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => exportCsv(`audit-log-${new Date().toISOString().slice(0, 10)}`, ["Timestamp", "Actor", "Role", "Action", "Target", "Detail"], filtered as unknown as Array<Record<string, unknown>>, ["ts", "actor", "role", "action", "target", "meta"])}><AIcon name="download" size={15} stroke="var(--ad-muted)" />Export log</button>
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
