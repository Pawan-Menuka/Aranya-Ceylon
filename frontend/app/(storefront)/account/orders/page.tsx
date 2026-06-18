"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { formatPrice } from "@/lib/format";
import type { ApiOrder } from "@/lib/api/types";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};
const STATUS_COLOR: Record<string, string> = {
  PAID: "var(--brand)", PROCESSING: "var(--brand)", SHIPPED: "var(--brand-2)",
  DELIVERED: "var(--brand-2)", PENDING: "var(--accent)", CANCELLED: "#B23B3B", REFUNDED: "#B23B3B",
};

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const [orders, setOrders] = useState<ApiOrder[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) { router.replace("/account/login"); return; }
    (async () => {
      try {
        const res = await fetch("/api/orders", { cache: "no-store" });
        const data = (await res.json()) as { orders: ApiOrder[] | null };
        if (data.orders === null) { router.replace("/account/login"); return; }
        setOrders(data.orders);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, sessionLoading, router]);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>
      <nav style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
        <Link href="/account" style={{ color: "var(--muted)" }}>Account</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span>Orders</span>
      </nav>
      <h1 className="disp" style={{ fontSize: "clamp(30px,4vw,42px)", margin: "0 0 24px" }}>Your orders</h1>

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading your orders…</p>
      ) : !orders || orders.length === 0 ? (
        <div>
          <p className="prose" style={{ color: "var(--muted)", marginBottom: 20 }}>You haven’t placed any orders yet.</p>
          <Link href="/products" className="btn btn-intl" style={{ display: "inline-block" }}>Start shopping</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {orders.map((o) => <OrderCard key={o.id} order={o} />)}
        </div>
      )}
    </main>
  );
}

function OrderCard({ order }: { order: ApiOrder }) {
  const date = new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const shortId = order.id.slice(-8).toUpperCase();
  return (
    <article style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, padding: "16px 20px", background: "var(--surface)" }}>
        <div>
          <div style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 13, color: "var(--muted)" }}>#{shortId} · {date}</div>
          <div style={{ fontFamily: "var(--font-ui), sans-serif", fontWeight: 700, fontSize: 18 }}>{formatPrice(order.total, order.currency)}</div>
        </div>
        <span className="eyebrow" style={{ color: STATUS_COLOR[order.status] ?? "var(--muted)", border: `1px solid ${STATUS_COLOR[order.status] ?? "var(--line)"}`, borderRadius: 999, padding: "5px 12px" }}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </header>

      <div style={{ padding: "16px 20px" }}>
        {order.items.map((it, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "4px 0" }}>
            <span>{it.product.name} <span style={{ color: "var(--muted)" }}>· {it.variant.weight}g × {it.quantity}</span></span>
            <span style={{ whiteSpace: "nowrap" }}>{formatPrice(Number(it.unitPrice) * it.quantity, order.currency)}</span>
          </div>
        ))}

        {order.trackingNumber && (
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 12 }}>Tracking: <strong style={{ color: "var(--ink)" }}>{order.trackingNumber}</strong></p>
        )}

        {order.timeline.length > 0 && (
          <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: "pointer", fontFamily: "var(--font-ui), sans-serif", fontSize: 13, color: "var(--brand)" }}>Order timeline</summary>
            <ul style={{ listStyle: "none", padding: "10px 0 0", margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {order.timeline.map((e, i) => (
                <li key={i} style={{ fontSize: 13, color: "var(--muted)" }}>
                  <strong style={{ color: "var(--ink)" }}>{STATUS_LABEL[e.status] ?? e.status}</strong>
                  {e.note ? ` — ${e.note}` : ""}{" "}
                  <span>· {new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </article>
  );
}
