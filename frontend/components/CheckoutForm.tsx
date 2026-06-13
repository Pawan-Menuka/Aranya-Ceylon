"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "./CartProvider";
import type { Market } from "@/lib/market";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  background: "#fff",
  fontFamily: "var(--font-ui), sans-serif",
  fontSize: 14,
  color: "var(--ink)",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui), sans-serif",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: ".02em",
  color: "var(--muted)",
  marginBottom: 6,
};

export function CheckoutForm({ market }: { market: Market }) {
  const router = useRouter();
  const { cart, refresh } = useCart();
  const intl = market === "INTERNATIONAL";

  const [form, setForm] = useState({
    email: "",
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
    country: intl ? "US" : "LK", // LOCAL orders must ship to LK (backend-enforced)
    shippingMethod: "STANDARD" as "STANDARD" | "EXPRESS",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const empty = !cart || cart.items.length === 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddress: {
            line1: form.line1,
            line2: form.line2 || undefined,
            city: form.city,
            country: intl ? form.country.toUpperCase() : "LK",
            postalCode: form.postalCode,
          },
          shippingMethod: form.shippingMethod,
          guestEmail: form.email,
          customerName: form.name || undefined,
          customerPhone: form.phone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Checkout failed. Please check your details and try again.");
        setSubmitting(false);
        return;
      }

      if (data.gateway === "stub") {
        // Stub mode: simulate the gateway confirming payment.
        const done = await fetch("/api/checkout/stub-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data.orderId }),
        });
        if (!done.ok) {
          setError("Payment confirmation failed.");
          setSubmitting(false);
          return;
        }
        await refresh(); // cart was cleared server-side
        router.push(`/checkout/success?orderId=${data.orderId}`);
        return;
      }

      // Live gateways (Stripe Elements / PayHere redirect) arrive in a later
      // phase. In this build PAYMENTS_MODE is stub.
      setError("Live payments are not enabled in this build. Set PAYMENTS_MODE=stub.");
      setSubmitting(false);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  if (empty) {
    return (
      <div style={{ padding: "40px 0" }}>
        <p className="prose" style={{ fontSize: 18, color: "var(--muted)", marginBottom: 20 }}>
          Your cart is empty — nothing to check out.
        </p>
        <Link href="/products" className="btn btn-intl" style={{ display: "inline-block" }}>
          Browse the harvest
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 40, alignItems: "start" }}>
      {/* Details */}
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          <legend className="disp" style={{ fontSize: 20, marginBottom: 8 }}>Contact</legend>
          <div>
            <label style={labelStyle}>Email (order confirmation)</label>
            <input type="email" required value={form.email} onChange={set("email")} style={inputStyle} placeholder="you@example.com" />
          </div>
          <div>
            <label style={labelStyle}>Full name</label>
            <input value={form.name} onChange={set("name")} style={inputStyle} placeholder="Your name" />
          </div>
          <div>
            <label style={labelStyle}>Phone {intl ? "(optional)" : ""}</label>
            <input value={form.phone} onChange={set("phone")} style={inputStyle} placeholder="+94 …" required={!intl} />
          </div>
        </fieldset>

        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          <legend className="disp" style={{ fontSize: 20, marginBottom: 8 }}>Shipping address</legend>
          <div>
            <label style={labelStyle}>Address line 1</label>
            <input required value={form.line1} onChange={set("line1")} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Address line 2 (optional)</label>
            <input value={form.line2} onChange={set("line2")} style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>City</label>
              <input required value={form.city} onChange={set("city")} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Postal code</label>
              <input required value={form.postalCode} onChange={set("postalCode")} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Country</label>
            {intl ? (
              <input
                required
                value={form.country}
                onChange={set("country")}
                style={inputStyle}
                maxLength={2}
                placeholder="US"
              />
            ) : (
              <input value="Sri Lanka (LK)" disabled style={{ ...inputStyle, background: "var(--surface)", color: "var(--muted)" }} />
            )}
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {intl ? "ISO 2-letter code (e.g. US, GB, AU)." : "Local orders ship within Sri Lanka."}
            </span>
          </div>
        </fieldset>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="disp" style={{ fontSize: 20, marginBottom: 12 }}>Shipping method</legend>
          {(["STANDARD", "EXPRESS"] as const).map((m) => (
            <label key={m} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }}>
              <input type="radio" name="ship" checked={form.shippingMethod === m} onChange={() => setForm((f) => ({ ...f, shippingMethod: m }))} />
              <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 14 }}>
                {m === "STANDARD" ? "Standard" : "Express"}
              </span>
            </label>
          ))}
        </fieldset>
      </div>

      {/* Summary */}
      <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: 24, position: "sticky", top: 88 }}>
        <h2 className="disp" style={{ fontSize: 20, marginTop: 0, marginBottom: 16 }}>Order summary</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {cart!.items.map((it) => (
            <div key={it.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, gap: 12 }}>
              <span style={{ color: "var(--ink)" }}>{it.name} <span style={{ color: "var(--muted)" }}>· {it.weight}g × {it.qty}</span></span>
              <span style={{ whiteSpace: "nowrap" }}>{it.lineTotal}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 12, fontWeight: 700 }}>
          <span>Subtotal</span>
          <span>{cart!.subtotal}</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 18px" }}>
          Shipping is added at the payment step.
        </p>

        {error && (
          <p style={{ color: "#B23B3B", fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}

        <button type="submit" disabled={submitting} className={`btn ${intl ? "btn-intl" : "btn-local"}`} style={{ width: "100%", opacity: submitting ? 0.6 : 1 }}>
          {submitting ? "Processing…" : "Pay (test mode)"}
        </button>
        <p style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 10 }}>
          Test mode — no real payment is taken.
        </p>
      </div>
    </form>
  );
}
