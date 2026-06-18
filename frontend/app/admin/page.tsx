"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { AdminDashboard } from "@/lib/api/admin-types";

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData((await res.json()) as AdminDashboard);
        setState("ready");
      } catch {
        setState("error");
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="disp" style={{ fontSize: "clamp(28px,3vw,40px)", margin: "0 0 4px", color: "var(--ink)" }}>
        Dashboard
      </h1>
      <p style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 13.5, color: "var(--muted)", margin: "0 0 28px" }}>
        Trailing 30 days
      </p>

      {state === "loading" && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      {state === "error" && (
        <p style={{ color: "#B23B3B" }}>Couldn’t load dashboard data. Is the API reachable?</p>
      )}

      {state === "ready" && data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {/* Revenue + stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <StatCard
              label="Local revenue"
              value={formatPrice(data.revenue.local.total ?? 0, "LKR")}
              sub={`${data.revenue.local.orders} paid orders`}
            />
            <StatCard
              label="International revenue"
              value={formatPrice(data.revenue.international.total ?? 0, "USD")}
              sub={`${data.revenue.international.orders} paid orders`}
            />
            <StatCard label="Orders (local)" value={String(data.orders.localCount)} sub="all statuses" />
            <StatCard label="Orders (intl)" value={String(data.orders.intlCount)} sub="all statuses" />
            <StatCard
              label="Awaiting fulfilment"
              value={String(data.orders.pendingFulfilment)}
              sub="processing"
              accent={data.orders.pendingFulfilment > 0}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 28 }}>
            {/* Low stock */}
            <Panel title="Low stock">
              {data.lowStockVariants.length === 0 ? (
                <Empty>Everything is well stocked.</Empty>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {data.lowStockVariants.map((v) => (
                    <li
                      key={v.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 14,
                        padding: "9px 0",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <span>
                        {v.product.name} <span style={{ color: "var(--muted)" }}>· {v.weight}g · {v.sku}</span>
                      </span>
                      <strong style={{ color: v.stock === 0 ? "#B23B3B" : "var(--accent)" }}>{v.stock} left</strong>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* Top products */}
            <Panel title="Top products" hint="by orders, 30d">
              {data.topProducts.length === 0 ? (
                <Empty>No orders yet.</Empty>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {data.topProducts.map((p, i) => (
                    <li
                      key={p.productId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 14,
                        padding: "9px 0",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <span style={{ color: "var(--muted)" }}>
                        {i + 1}. <code style={{ fontSize: 12 }}>{p.productId.slice(-8)}</code>
                      </span>
                      <strong>{p._sum.quantity ?? 0} units</strong>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {/* Recent audit */}
          <Panel title="Recent activity" action={<Link href="/admin/audit" style={linkStyle}>View all →</Link>}>
            {data.recentAuditLogs.length === 0 ? (
              <Empty>No recorded activity.</Empty>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {data.recentAuditLogs.map((log) => (
                  <li
                    key={log.id}
                    style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13.5, padding: "8px 0", borderBottom: "1px solid var(--line)" }}
                  >
                    <span>
                      <strong style={{ fontFamily: "var(--font-ui), sans-serif" }}>{log.event}</strong>
                      {log.targetType ? <span style={{ color: "var(--muted)" }}> · {log.targetType}</span> : null}
                      {log.actor ? <span style={{ color: "var(--muted)" }}> · {log.actor.name}</span> : null}
                    </span>
                    <span style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {new Date(log.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

const linkStyle = { fontFamily: "var(--font-ui), sans-serif", fontSize: 13, fontWeight: 600, color: "var(--brand)", textDecoration: "none" } as const;

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: accent ? "1px solid var(--accent)" : "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: "18px 20px",
      }}
    >
      <div style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)" }}>
        {label}
      </div>
      <div className="disp" style={{ fontSize: 30, color: "var(--ink)", margin: "6px 0 2px" }}>
        {value}
      </div>
      {sub && <div style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 12.5, color: "var(--muted)" }}>{sub}</div>}
    </div>
  );
}

function Panel({ title, hint, action, children }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "20px 22px", background: "#fff" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <h2 className="disp" style={{ fontSize: 20, margin: 0, color: "var(--ink)" }}>
          {title}
          {hint && <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>{hint}</span>}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 14, color: "var(--muted)", margin: 0 }}>{children}</p>;
}
