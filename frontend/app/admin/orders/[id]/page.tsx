"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { OrderBadge } from "@/components/admin/OrderBadge";
import { STATUS_LABEL, SETTABLE_STATUSES, REFUNDABLE } from "@/components/admin/orderStatus";
import type { AdminOrderDetail } from "@/lib/api/admin-types";

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "notfound">("loading");

  // status-update form
  const [status, setStatus] = useState<string>("");
  const [tracking, setTracking] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`, { cache: "no-store" });
      if (res.status === 404) return setState("notfound");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { order: AdminOrderDetail };
      setOrder(data.order);
      setStatus(data.order.status);
      setTracking(data.order.trackingNumber ?? "");
      setState("ready");
    } catch {
      setState("error");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveStatus = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(tracking ? { trackingNumber: tracking } : {}), ...(note ? { note } : {}) }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      setNote("");
      setMsg("Order updated.");
      await load();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const refund = async () => {
    if (!confirm("Issue a refund for this order? This restores stock and (for international orders) refunds via Stripe.")) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}/refund`, { method: "POST" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      setMsg("Refund issued.");
      await load();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (state === "loading") return <p style={{ color: "var(--muted)" }}>Loading order…</p>;
  if (state === "notfound") return <NotFound />;
  if (state === "error" || !order) return <p style={{ color: "#B23B3B" }}>Couldn’t load this order.</p>;

  return (
    <div style={{ maxWidth: 900 }}>
      <nav style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
        <Link href="/admin/orders" style={{ color: "var(--muted)" }}>Orders</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span>#{order.id.slice(-8).toUpperCase()}</span>
      </nav>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <h1 className="disp" style={{ fontSize: "clamp(26px,3vw,38px)", margin: 0, color: "var(--ink)" }}>
          Order #{order.id.slice(-8).toUpperCase()}
        </h1>
        <OrderBadge status={order.status} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 28 }}>
        {/* Left: items + customer */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Card title="Customer">
            {order.user ? (
              <>
                <Row k="Name" v={order.user.name} />
                <Row k="Email" v={order.user.email} />
              </>
            ) : (
              <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>Guest checkout</p>
            )}
            <Row k="Market" v={order.market === "LOCAL" ? "Local (LKR)" : "International (USD)"} />
            <Row k="Placed" v={new Date(order.createdAt).toLocaleString("en-US")} />
            {order.coupon && <Row k="Coupon" v={order.coupon.code} />}
          </Card>

          <Card title="Items">
            {order.items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                <span>
                  {it.product.name} <span style={{ color: "var(--muted)" }}>· {it.variant.weight}g × {it.quantity}</span>
                </span>
                <span style={{ whiteSpace: "nowrap" }}>{formatPrice(Number(it.unitPrice) * it.quantity, order.currency)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, paddingTop: 12 }}>
              <span>Total</span>
              <span>{formatPrice(order.total, order.currency)}</span>
            </div>
          </Card>

          {order.timeline.length > 0 && (
            <Card title="Timeline">
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {order.timeline.map((e, i) => (
                  <li key={i} style={{ fontSize: 13.5 }}>
                    <strong>{STATUS_LABEL[e.status] ?? e.status}</strong>
                    {e.note ? <span style={{ color: "var(--muted)" }}> — {e.note}</span> : null}
                    <span style={{ color: "var(--muted)" }}> · {new Date(e.createdAt).toLocaleString("en-US")}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Right: actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Card title="Update status">
            <label style={labelStyle}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
              {SETTABLE_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>

            <label style={labelStyle}>Tracking number {status === "SHIPPED" && <span style={{ color: "var(--accent)" }}>(emails the customer)</span>}</label>
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="e.g. LK123456789" style={inputStyle} />

            <label style={labelStyle}>Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal/customer note" style={inputStyle} />

            <button onClick={saveStatus} disabled={saving} className="btn btn-intl" style={{ marginTop: 14, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </Card>

          {REFUNDABLE.includes(order.status) && (
            <Card title="Refund">
              <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "0 0 12px" }}>
                Marks the order REFUNDED, restores stock, and refunds via Stripe for international orders. PayHere (local)
                refunds are handled manually.
              </p>
              <button
                onClick={refund}
                disabled={saving}
                style={{
                  fontFamily: "var(--font-ui), sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#B23B3B",
                  background: "#fff",
                  border: "1px solid #B23B3B",
                  borderRadius: 8,
                  padding: "10px 16px",
                  cursor: saving ? "default" : "pointer",
                }}
              >
                Issue refund
              </button>
            </Card>
          )}

          {msg && <p style={{ fontSize: 13.5, color: msg.includes("issued") || msg.includes("updated") ? "var(--brand)" : "#B23B3B" }}>{msg}</p>}
        </div>
      </div>
    </div>
  );
}

const labelStyle = { display: "block", fontFamily: "var(--font-ui), sans-serif", fontSize: 12, fontWeight: 600, color: "var(--muted)", margin: "12px 0 5px" } as const;
const inputStyle = { width: "100%", fontFamily: "var(--font-ui), sans-serif", fontSize: 14, padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff" } as const;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "18px 20px", background: "#fff" }}>
      <h2 className="disp" style={{ fontSize: 19, margin: "0 0 12px", color: "var(--ink)" }}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "5px 0" }}>
      <span style={{ color: "var(--muted)" }}>{k}</span>
      <span style={{ textAlign: "right" }}>{v}</span>
    </div>
  );
}

function NotFound() {
  return (
    <div>
      <p className="prose" style={{ color: "var(--muted)" }}>This order doesn’t exist.</p>
      <Link href="/admin/orders" style={{ color: "var(--brand)", fontFamily: "var(--font-ui), sans-serif", fontWeight: 600 }}>← Back to orders</Link>
    </div>
  );
}
