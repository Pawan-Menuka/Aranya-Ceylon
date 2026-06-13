"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { STATUS_LABEL } from "@/components/admin/orderStatus";
import { OrderBadge } from "@/components/admin/OrderBadge";
import type { AdminOrder, AdminOrderPage } from "@/lib/api/admin-types";

const MARKETS = ["ALL", "LOCAL", "INTERNATIONAL"];
const STATUSES = ["", "PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [market, setMarket] = useState("ALL");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const qs = new URLSearchParams({ market, ...(status ? { status } : {}), limit: "50" });
      const res = await fetch(`/api/admin/orders?${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AdminOrderPage;
      setOrders(data.items ?? []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [market, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h1 className="disp" style={{ fontSize: "clamp(28px,3vw,40px)", margin: "0 0 20px", color: "var(--ink)" }}>
        Orders
      </h1>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24, alignItems: "center" }}>
        <Field label="Market">
          {MARKETS.map((m) => (
            <Chip key={m} on={market === m} onClick={() => setMarket(m)}>
              {m === "ALL" ? "All" : m === "LOCAL" ? "Local" : "International"}
            </Chip>
          ))}
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              fontFamily: "var(--font-ui), sans-serif",
              fontSize: 13.5,
              padding: "8px 12px",
              border: "1px solid var(--line)",
              borderRadius: 8,
              background: "#fff",
            }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s ? STATUS_LABEL[s] : "Any status"}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {state === "loading" && <p style={{ color: "var(--muted)" }}>Loading orders…</p>}
      {state === "error" && <p style={{ color: "#B23B3B" }}>Couldn’t load orders.</p>}
      {state === "ready" && orders.length === 0 && <p style={{ color: "var(--muted)" }}>No orders match these filters.</p>}

      {state === "ready" && orders.length > 0 && (
        <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-ui), sans-serif", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--surface)", textAlign: "left" }}>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Market</Th>
                <Th>Total</Th>
                <Th>Status</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <Td>
                    <Link href={`/admin/orders/${o.id}`} style={{ color: "var(--brand)", fontWeight: 600, textDecoration: "none" }}>
                      #{o.id.slice(-8).toUpperCase()}
                    </Link>
                  </Td>
                  <Td>{o.user ? o.user.name : <span style={{ color: "var(--muted)" }}>Guest</span>}</Td>
                  <Td>{o.market === "LOCAL" ? "Local" : "Intl"}</Td>
                  <Td>{formatPrice(o.total, o.currency)}</Td>
                  <Td>
                    <OrderBadge status={o.status} />
                  </Td>
                  <Td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: 6 }}>{children}</div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "var(--font-ui), sans-serif",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        padding: "7px 13px",
        borderRadius: 999,
        border: on ? "1px solid var(--brand)" : "1px solid var(--line)",
        background: on ? "var(--brand)" : "#fff",
        color: on ? "#fff" : "var(--ink)",
      }}
    >
      {children}
    </button>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>{children}</th>;
}
function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "12px 16px", ...style }}>{children}</td>;
}
