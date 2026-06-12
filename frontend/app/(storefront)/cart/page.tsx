"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import type { CartItemView } from "@/lib/api/types";

export default function CartPage() {
  const { cart, loading } = useCart();

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 80px" }}>
      <p className="eyebrow" style={{ color: "var(--accent)" }}>Your bag</p>
      <h1 className="disp" style={{ fontSize: "clamp(32px,4.5vw,46px)", margin: "6px 0 28px" }}>Cart</h1>

      {loading && !cart ? (
        <p style={{ color: "var(--muted)" }}>Loading your cart…</p>
      ) : !cart || cart.items.length === 0 ? (
        <EmptyCart />
      ) : (
        <CartContents />
      )}
    </main>
  );
}

function EmptyCart() {
  return (
    <div style={{ padding: "40px 0" }}>
      <p className="prose" style={{ fontSize: 18, color: "var(--muted)", marginBottom: 20 }}>
        Your cart is empty.
      </p>
      <Link href="/products" className="btn btn-intl" style={{ display: "inline-block" }}>
        Browse the harvest
      </Link>
    </div>
  );
}

function CartContents() {
  const { cart } = useCart();
  if (!cart) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {cart.items.map((item) => (
          <CartRow key={item.id} item={item} />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "2px solid var(--ink)",
          paddingTop: 18,
          marginTop: 8,
        }}
      >
        <div>
          <span className="eyebrow" style={{ color: "var(--muted)" }}>Subtotal</span>
          <div style={{ fontFamily: "var(--font-ui), sans-serif", fontWeight: 700, fontSize: 26 }}>
            {cart.subtotal}
          </div>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Shipping &amp; taxes calculated at checkout</span>
        </div>
        <Link
          href="/checkout"
          className="btn btn-intl"
          style={{ display: "inline-block", pointerEvents: "auto" }}
          title="Checkout lands in Phase 2b"
        >
          Proceed to checkout
        </Link>
      </div>
    </div>
  );
}

function CartRow({ item }: { item: CartItemView }) {
  const { updateQty, removeItem } = useCart();
  const [busy, setBusy] = useState(false);

  const change = async (q: number) => {
    setBusy(true);
    await updateQty(item.id, q);
    setBusy(false);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "64px 1fr auto",
        gap: 16,
        alignItems: "center",
        padding: "18px 0",
        borderBottom: "1px solid var(--line)",
        opacity: busy ? 0.55 : 1,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 64,
          height: 64,
          borderRadius: "var(--radius)",
          borderTop: `4px solid ${item.color}`,
          background: `linear-gradient(135deg, ${item.color}22, ${item.color}0a)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="disp" style={{ fontSize: 24, color: item.color, opacity: 0.5 }}>
          {item.name.charAt(0)}
        </span>
      </div>

      <div style={{ minWidth: 0 }}>
        <Link href={`/products/${item.slug}`} className="disp" style={{ fontSize: 18 }}>
          {item.name}
        </Link>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
          {item.weight}g · {item.unitPrice} each
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <Stepper value={item.qty} onChange={change} disabled={busy} />
          <button
            onClick={() => removeItem(item.id)}
            disabled={busy}
            style={{ background: "none", border: 0, color: "var(--muted)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
          >
            Remove
          </button>
        </div>
      </div>

      <div style={{ fontFamily: "var(--font-ui), sans-serif", fontWeight: 700, fontSize: 16, whiteSpace: "nowrap" }}>
        {item.lineTotal}
      </div>
    </div>
  );
}

function Stepper({ value, onChange, disabled }: { value: number; onChange: (q: number) => void; disabled: boolean }) {
  const btn = {
    width: 28,
    height: 28,
    border: "1px solid var(--line)",
    background: "#fff",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
  } as const;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button style={btn} onClick={() => onChange(Math.max(0, value - 1))} disabled={disabled} aria-label="Decrease">−</button>
      <span style={{ minWidth: 20, textAlign: "center", fontFamily: "var(--font-ui), sans-serif", fontWeight: 600 }}>{value}</span>
      <button style={btn} onClick={() => onChange(Math.min(99, value + 1))} disabled={disabled} aria-label="Increase">+</button>
    </div>
  );
}
