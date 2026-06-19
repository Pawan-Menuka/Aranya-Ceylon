"use client";

import * as React from "react";
import Link from "next/link";
import { Seal } from "../primitives/Seal";
import { SpicePhoto } from "../primitives/SpicePhoto";
import { useCart } from "../CartContext";
import { useMarket } from "../MarketContext";
import { useAuth } from "../AuthContext";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { createIntent, pollOrderPaid, type CheckoutInput, type PayHereIntent, type StripeIntent, type StubIntent } from "@/lib/api/checkout";
import type { Market } from "@/lib/types";

// Checkout page: guest-first single-page form.
// On submit:
//   - International → POST create-intent → Stripe Elements or manual redirect
//   - Local        → POST create-intent → hidden PayHere form auto-submitted
// Success state polls GET /orders/:id until the webhook flips the order to PAID.

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

function CheckoutHeader({ market, onMarket }: { market: Market; onMarket: (m: Market) => void }) {
  return (
    <header style={{ background: "var(--brand)", color: "#FDFAF5", borderBottom: "1px solid rgba(253,250,245,.14)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px", height: 76, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/products" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}>
          <Seal size={40} tone="light" />
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span className="disp" style={{ fontSize: 25, color: "#FDFAF5", letterSpacing: ".02em" }}>Aranya Ceylon</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 8.5, letterSpacing: ".34em", color: "#E6B860", fontWeight: 600, textTransform: "uppercase", marginTop: 3 }}>Forest Sourced Spices</span>
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 7, color: "rgba(253,250,245,.85)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E6B860" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            Secure checkout
          </span>
          <div style={{ display: "inline-flex", border: "1px solid rgba(253,250,245,.28)", borderRadius: 999, overflow: "hidden" }}>
            {([["intl", "USD"], ["local", "LKR"]] as [Market, string][]).map(([m, l]) => (
              <button key={m} onClick={() => onMarket(m)} style={{ background: market === m ? "rgba(253,250,245,.95)" : "transparent", color: market === m ? "var(--brand)" : "rgba(253,250,245,.85)", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, padding: "7px 14px" }}>{l}</button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

function Field({
  label, type = "text", ph, value, onChange, half, required,
}: {
  label: string; type?: string; ph?: string;
  value: string; onChange: (v: string) => void;
  half?: boolean; required?: boolean;
}) {
  return (
    <label style={{ display: "block", flex: half ? "1 1 0" : "1 1 100%", minWidth: 0 }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "var(--brand)", marginLeft: 3 }}>*</span>}
      </span>
      <input
        type={type}
        placeholder={ph}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 14px", background: "#fff", outline: "none" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--line)")}
      />
    </label>
  );
}

function SelectField({
  label, value, onChange, options, half,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[];
  half?: boolean;
}) {
  return (
    <label style={{ display: "block", flex: half ? "1 1 0" : "1 1 100%", minWidth: 0 }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 6 }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 14px", background: "#fff", outline: "none", appearance: "none" }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function Section({ n, title, sub, children }: { n: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section style={{ background: "#FFFDF9", border: "1px solid var(--line)", borderRadius: 12, padding: "26px 28px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: sub ? 4 : 20 }}>
        <span style={{ width: 28, height: 28, borderRadius: 999, background: "var(--brand)", color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, flex: "0 0 auto" }}>{n}</span>
        <h2 className="disp" style={{ fontSize: 26, color: "var(--ink)", margin: 0, lineHeight: 1 }}>{title}</h2>
      </div>
      {sub && <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", margin: "0 0 18px", paddingLeft: 40 }}>{sub}</p>}
      <div style={{ paddingLeft: 40 }}>{children}</div>
    </section>
  );
}

function DeliveryOptions({ market, value, onChange, standardLabel }: { market: Market; value: string; onChange: (v: string) => void; standardLabel: string }) {
  const opts: [string, string, string, string][] = market === "local"
    ? [["standard", "Island-wide courier", "1–3 working days", standardLabel], ["express", "Express (Colombo metro)", "Next day", "Rs 1,500"]]
    : [["standard", "Tracked international", "7–12 working days", standardLabel], ["express", "Express courier (DHL)", "3–5 working days", "$18.00"]];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {opts.map(([id, title, eta, price]) => {
        const on = value === id;
        return (
          <button key={id} onClick={() => onChange(id)} style={{ display: "flex", alignItems: "center", gap: 14, textAlign: "left", cursor: "pointer", border: on ? "1.5px solid var(--brand)" : "1px solid var(--line)", background: on ? "rgba(15,110,86,.05)" : "#fff", borderRadius: 9, padding: "14px 16px" }}>
            <span style={{ width: 18, height: 18, borderRadius: 999, flex: "0 0 auto", border: on ? "5px solid var(--brand)" : "1.5px solid var(--line)", background: "#fff", transition: "border .15s" }} />
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{title}</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)" }}>{eta}</span>
            </span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: price === "Free" ? "var(--brand)" : "var(--ink)" }}>{price}</span>
          </button>
        );
      })}
    </div>
  );
}

function SumRow({ label, val, accent }: { label: string; val: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-ui)", fontSize: 13.5 }}>
      <span style={{ color: "var(--muted)", fontWeight: 500 }}>{label}</span>
      <span style={{ color: accent ? "var(--brand)" : "var(--ink)", fontWeight: 700 }}>{val}</span>
    </div>
  );
}

function OrderSummary({ deliv, expressFee }: { deliv: string; expressFee: number }) {
  const cart = useCart();
  const items = cart.items;
  const t = cart.totals;
  const shipShown = deliv === "express" ? expressFee : t.ship;
  const totalShown = t.subtotal - t.discount + t.gift + shipShown;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "24px 24px 26px", position: "sticky", top: 24 }}>
      <h3 className="disp" style={{ fontSize: 23, color: "var(--ink)", margin: "0 0 18px" }}>Order summary</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, margin: "0 -4px 18px", padding: "9px 4px 0", maxHeight: 289, overflowY: "auto" }}>
        {items.map((it) => (
          <div key={it.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ position: "relative", flex: "0 0 auto" }}>
              <div style={{ width: 52, height: 52, borderRadius: 7, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)" }}><SpicePhoto spice={it} ratio="1 / 1" label={false} /></div>
              <span style={{ position: "absolute", top: -7, right: -7, minWidth: 19, height: 19, padding: "0 5px", background: "var(--brand)", color: "#fff", borderRadius: 999, fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center" }}>{it.qty}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="disp" style={{ fontSize: 16.5, color: "var(--ink)", lineHeight: 1.1 }}>{it.name}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>{it.weight} · {it.form}</div>
            </div>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{cart.fmt(cart.linePrice(it))}</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        <SumRow label="Subtotal" val={t.fmt(t.subtotal)} />
        {t.discount > 0 && <SumRow label={"Discount (" + cart.promo + ")"} val={"−" + t.fmt(t.discount)} accent />}
        {t.gift > 0 && <SumRow label="Gift wrapping" val={t.fmt(t.gift)} />}
        <SumRow label="Shipping" val={shipShown === 0 ? "Free" : t.fmt(shipShown)} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
        <span className="disp" style={{ fontSize: 22, color: "var(--ink)", fontWeight: 600 }}>Total</span>
        <span className="disp" style={{ fontSize: 30, color: "var(--ink)", fontWeight: 600 }}>{t.fmt(totalShown)}</span>
      </div>
      {cart.giftNote && (
        <div style={{ marginTop: 16, padding: "12px 14px", background: "#fff", border: "1px dashed var(--line)", borderRadius: 8 }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>Gift note</div>
          <div className="prose" style={{ fontSize: 14, color: "var(--ink)", fontStyle: "italic" }}>&ldquo;{cart.giftNote}&rdquo;</div>
        </div>
      )}
    </div>
  );
}

function OrderConfirmation({ order }: { order: { id: string; email: string; total: string } }) {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "70px 40px 100px", textAlign: "center" }}>
      <div style={{ width: 72, height: 72, borderRadius: 999, background: "rgba(15,110,86,.1)", display: "grid", placeItems: "center", margin: "0 auto 24px" }}>
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
      </div>
      <div className="eyebrow" style={{ color: "var(--accent)", justifyContent: "center", display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <span style={{ width: 24, height: 1, background: "var(--accent)" }} />Order confirmed<span style={{ width: 24, height: 1, background: "var(--accent)" }} />
      </div>
      <h1 className="disp" style={{ fontSize: 46, color: "var(--brand)", margin: "0 0 14px", lineHeight: 1.05 }}>Thank you — your spices are on their way</h1>
      <p className="prose" style={{ fontSize: 17, color: "var(--ink)", margin: "0 0 8px" }}>
        We&rsquo;ve emailed a confirmation to <b>{order.email || "your inbox"}</b>. Each order is sealed within 24 hours, fresh from the hill country.
      </p>
      <div style={{ display: "inline-flex", gap: 28, margin: "26px 0 32px", padding: "18px 30px", background: "var(--surface)", borderRadius: 12 }}>
        <div><div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>Order no.</div><div className="disp" style={{ fontSize: 22, color: "var(--ink)", fontWeight: 600 }}>{order.id}</div></div>
        <div style={{ width: 1, background: "var(--line)" }} />
        <div><div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>Total</div><div className="disp" style={{ fontSize: 22, color: "var(--ink)", fontWeight: 600 }}>{order.total}</div></div>
      </div>
      <div>
        <Link href="/products" className="btn btn-intl" style={{ display: "inline-flex", width: "auto", padding: "14px 34px", textDecoration: "none" }}>Continue shopping</Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hidden PayHere form — auto-submitted to redirect the customer to PayHere
// ---------------------------------------------------------------------------

function PayHereRedirectForm({ intent }: { intent: PayHereIntent }) {
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    // Submit on the next tick so the DOM is ready
    const t = setTimeout(() => formRef.current?.submit(), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ maxWidth: 520, margin: "80px auto", textAlign: "center" }}>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--muted)", marginBottom: 24 }}>
        Redirecting to PayHere for secure payment…
      </p>
      <form ref={formRef} method="POST" action={intent.action} style={{ display: "none" }}>
        {Object.entries(intent.params).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      </form>
      <button
        type="button"
        onClick={() => formRef.current?.submit()}
        className="btn btn-local"
        style={{ display: "inline-flex", width: "auto", padding: "13px 30px" }}
      >
        Go to PayHere
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Country options
// ---------------------------------------------------------------------------

const INTL_COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "CA", label: "Canada" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "JP", label: "Japan" },
  { value: "SG", label: "Singapore" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "NZ", label: "New Zealand" },
  { value: "IN", label: "India" },
  { value: "MY", label: "Malaysia" },
];

// ---------------------------------------------------------------------------
// Stripe Elements payment screen
// Mounted after createIntent returns a clientSecret; keeps the same 2-col layout
// but replaces the left column with a payment review + card form.
// ---------------------------------------------------------------------------

function StripePayForm({
  orderId,
  totalLabel,
  onPaid,
  onError,
}: {
  orderId: string;
  totalLabel: string;
  onPaid: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = React.useState(false);

  const handlePay = async () => {
    if (!stripe || !elements || paying) return;
    setPaying(true);
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (error) {
      onError(error.message ?? "Payment failed. Please try again.");
      setPaying(false);
    } else {
      await pollOrderPaid(orderId).catch(() => false);
      onPaid();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <PaymentElement options={{ layout: "tabs" }} />
      <button
        type="button"
        className="btn btn-intl"
        onClick={handlePay}
        disabled={!stripe || paying}
        style={{ opacity: !stripe || paying ? 0.72 : 1 }}
      >
        {paying ? "Processing payment…" : `Pay now — ${totalLabel}`}
      </button>
    </div>
  );
}

function StripePaymentScreen({
  intent,
  totalLabel,
  contactSummary,
  shippingSummary,
  market,
  onMarket,
  onPaid,
}: {
  intent: StripeIntent;
  totalLabel: string;
  contactSummary: string;
  shippingSummary: string;
  market: Market;
  onMarket: (m: Market) => void;
  onPaid: () => void;
}) {
  const [stripeError, setStripeError] = React.useState("");
  const stripePromise = React.useMemo(
    () => loadStripe(intent.publishableKey),
    [intent.publishableKey],
  );
  const cart = useCart();
  const t = cart.totals;
  const expressFee = market === "local" ? 1500 : 18;

  return (
    <div className="aranya" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <CheckoutHeader market={market} onMarket={onMarket} />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 40px 90px" }}>
        <h1 className="disp" style={{ fontSize: 44, color: "var(--brand)", margin: "0 0 26px", lineHeight: 1.02 }}>Payment</h1>
        <div className="ck-cols">
          <div>
            {/* Review summary */}
            <section style={{ background: "#FFFDF9", border: "1px solid var(--line)", borderRadius: 12, padding: "20px 24px", marginBottom: 18 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  ["Contact", contactSummary],
                  ["Shipping to", shippingSummary],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", gap: 14, fontFamily: "var(--font-ui)", fontSize: 13.5 }}>
                    <span style={{ color: "var(--muted)", fontWeight: 600, minWidth: 90 }}>{label}</span>
                    <span style={{ color: "var(--ink)" }}>{val}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Stripe card form */}
            <Section n="4" title="Card details" sub="Your payment is handled directly by Stripe — we never see your card number.">
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: intent.clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "#0F6E56",
                      colorText: "#1A1A1A",
                      borderRadius: "8px",
                      fontFamily: "var(--font-ui), system-ui, sans-serif",
                    },
                  },
                }}
              >
                <StripePayForm
                  orderId={intent.orderId}
                  totalLabel={totalLabel}
                  onPaid={onPaid}
                  onError={setStripeError}
                />
              </Elements>
              {stripeError && (
                <div style={{ marginTop: 14, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "11px 14px", fontFamily: "var(--font-ui)", fontSize: 13.5, color: "#b91c1c" }}>
                  {stripeError}
                </div>
              )}
            </Section>
          </div>

          <OrderSummary deliv="standard" expressFee={expressFee} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stub payment screen (dev / PAYMENTS_MODE !== 'live')
// ---------------------------------------------------------------------------

function StubPaymentScreen({
  intent,
  totalLabel,
  market,
  onMarket,
  onPaid,
}: {
  intent: StubIntent;
  totalLabel: string;
  market: Market;
  onMarket: (m: Market) => void;
  onPaid: () => void;
}) {
  const [confirming, setConfirming] = React.useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    // Hit the stub-complete endpoint to flip the order to PAID
    try {
      await fetch(`/api/checkout/stub/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: intent.orderId }),
        credentials: "include",
      });
    } catch { /* non-fatal */ }
    await pollOrderPaid(intent.orderId).catch(() => false);
    onPaid();
  };

  return (
    <div className="aranya" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <CheckoutHeader market={market} onMarket={onMarket} />
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "80px 40px 120px", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, background: "rgba(180,135,60,.12)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 3H8l-2 4h12l-2-4z" /><path d="M2 11h20" /></svg>
        </div>
        <div className="eyebrow" style={{ color: "var(--muted)", justifyContent: "center", display: "flex", marginBottom: 10 }}>Stub payment mode</div>
        <h1 className="disp" style={{ fontSize: 36, color: "var(--brand)", margin: "0 0 12px", lineHeight: 1.08 }}>Confirm test payment</h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--muted)", margin: "0 0 28px", lineHeight: 1.65 }}>
          Payments are in test mode. Click below to simulate a successful payment and confirm the order.
        </p>
        <div style={{ display: "inline-flex", gap: 24, background: "var(--surface)", padding: "16px 28px", borderRadius: 12, marginBottom: 28 }}>
          <div><div style={{ fontFamily: "var(--font-ui)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700, marginBottom: 3 }}>Order</div><div className="disp" style={{ fontSize: 18, color: "var(--ink)" }}>{intent.orderId.slice(0, 8)}</div></div>
          <div style={{ width: 1, background: "var(--line)" }} />
          <div><div style={{ fontFamily: "var(--font-ui)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700, marginBottom: 3 }}>Total</div><div className="disp" style={{ fontSize: 18, color: "var(--ink)" }}>{totalLabel}</div></div>
        </div>
        <button
          type="button"
          className="btn btn-intl"
          onClick={handleConfirm}
          disabled={confirming}
          style={{ display: "inline-flex", width: "auto", padding: "14px 36px", opacity: confirming ? 0.72 : 1 }}
        >
          {confirming ? "Confirming…" : "Confirm test payment"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main checkout component
// ---------------------------------------------------------------------------

export function CheckoutClient() {
  const cart = useCart();
  const { market, setMarket } = useMarket();
  const { user } = useAuth();
  const items = cart.items;

  // Delivery + payment method selection
  const [deliv, setDeliv] = React.useState("standard");
  const [pay, setPay] = React.useState("card");

  // Contact fields
  const [email, setEmail] = React.useState(user?.email ?? "");
  const [phone, setPhone] = React.useState("");

  // Shipping address fields
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [line1, setLine1] = React.useState("");
  const [line2, setLine2] = React.useState("");
  const [city, setCity] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [postalCode, setPostalCode] = React.useState("");
  const [country, setCountry] = React.useState(market === "local" ? "LK" : "US");

  // Flow state
  const [placing, setPlacing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [payhereIntent, setPayhereIntent] = React.useState<PayHereIntent | null>(null);
  const [stripeIntent, setStripeIntent] = React.useState<StripeIntent | null>(null);
  const [stubIntent, setStubIntent] = React.useState<StubIntent | null>(null);
  const [order, setOrder] = React.useState<{ id: string; email: string; total: string } | null>(null);

  // Keep email in sync when user signs in mid-session
  React.useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  // Reset country when market switches
  React.useEffect(() => {
    setCountry(market === "local" ? "LK" : "US");
    if (market === "local" && pay !== "card") setPay("card");
  }, [market, pay]);

  const expressFee = market === "local" ? 1500 : 18;
  const t = cart.totals;
  const shipShown = deliv === "express" ? expressFee : t.ship;
  const totalShown = t.subtotal - t.discount + t.gift + shipShown;

  const placeOrder = async () => {
    if (placing) return;
    setError("");

    // Basic validation
    if (!user && !email) { setError("Please enter your email address."); return; }
    if (!firstName || !line1 || !city) { setError("Please fill in all required shipping fields."); return; }

    setPlacing(true);
    try {
      const payload: CheckoutInput = {
        guestEmail: user ? undefined : email,
        customerPhone: phone || undefined,
        shippingAddress: {
          firstName,
          lastName,
          line1,
          line2: line2 || undefined,
          city,
          region: region || undefined,
          postalCode: postalCode || undefined,
          country,
        },
        shippingMethod: deliv.toUpperCase() as "STANDARD" | "EXPRESS",
        couponCode: cart.promo || undefined,
      };

      const intent = await createIntent(payload);

      if (intent.provider === "payhere") {
        // Render the hidden form which auto-submits and redirects to PayHere
        setPayhereIntent(intent);
        return; // don't clear cart yet — PayHere return_url page handles that
      }

      if (intent.provider === "stub") {
        // Dev/test mode — show a stub confirmation screen
        setStubIntent(intent);
        return;
      }

      // Stripe: mount Elements form so the user can enter card details
      setStripeIntent(intent);
      window.scrollTo({ top: 0 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setPlacing(false);
    }
  };

  const totalLabel = t.fmt(totalShown);

  const onPaid = () => {
    setOrder({ id: stripeIntent?.orderId ?? stubIntent?.orderId ?? "", email, total: totalLabel });
    setStripeIntent(null);
    setStubIntent(null);
    cart.clear();
    window.scrollTo({ top: 0 });
  };

  // PayHere redirect screen
  if (payhereIntent) {
    return (
      <div className="aranya" style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <CheckoutHeader market={market} onMarket={setMarket} />
        <PayHereRedirectForm intent={payhereIntent} />
      </div>
    );
  }

  // Stripe Elements payment screen
  if (stripeIntent) {
    return (
      <StripePaymentScreen
        intent={stripeIntent}
        totalLabel={totalLabel}
        contactSummary={[email, phone].filter(Boolean).join(" · ")}
        shippingSummary={[firstName, lastName, line1, city, country].filter(Boolean).join(", ")}
        market={market}
        onMarket={setMarket}
        onPaid={onPaid}
      />
    );
  }

  // Stub payment screen (test / dev mode)
  if (stubIntent) {
    return (
      <StubPaymentScreen
        intent={stubIntent}
        totalLabel={totalLabel}
        market={market}
        onMarket={setMarket}
        onPaid={onPaid}
      />
    );
  }

  // Order confirmed screen
  if (order) {
    return (
      <div className="aranya" style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <CheckoutHeader market={market} onMarket={setMarket} />
        <OrderConfirmation order={order} />
      </div>
    );
  }

  // Empty cart guard (resolved after backend cart hydration in CartContext)
  if (items.length === 0) {
    return (
      <div className="aranya" style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <CheckoutHeader market={market} onMarket={setMarket} />
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "90px 40px 120px", textAlign: "center" }}>
          <div style={{ opacity: 0.5, marginBottom: 20, display: "flex", justifyContent: "center" }}><Seal size={70} /></div>
          <h1 className="disp" style={{ fontSize: 38, color: "var(--ink)", margin: "0 0 12px" }}>Your basket is empty</h1>
          <p className="prose" style={{ fontSize: 16.5, color: "var(--muted)", margin: "0 0 26px" }}>Add a few spices before checking out — start with a hill-country bestseller.</p>
          <Link href="/products" className="btn btn-intl" style={{ display: "inline-flex", width: "auto", padding: "14px 32px", textDecoration: "none" }}>Browse the catalogue</Link>
        </div>
      </div>
    );
  }

  const standardLabel = t.freeShip ? "Free" : t.fmt(cart.config().ship);
  const localDistricts = [
    { value: "Colombo", label: "Colombo" }, { value: "Gampaha", label: "Gampaha" },
    { value: "Kalutara", label: "Kalutara" }, { value: "Kandy", label: "Kandy" },
    { value: "Matale", label: "Matale" }, { value: "Nuwara Eliya", label: "Nuwara Eliya" },
    { value: "Galle", label: "Galle" }, { value: "Matara", label: "Matara" },
    { value: "Hambantota", label: "Hambantota" }, { value: "Jaffna", label: "Jaffna" },
    { value: "Kilinochchi", label: "Kilinochchi" }, { value: "Mannar", label: "Mannar" },
    { value: "Vavuniya", label: "Vavuniya" }, { value: "Mullaitivu", label: "Mullaitivu" },
    { value: "Batticaloa", label: "Batticaloa" }, { value: "Ampara", label: "Ampara" },
    { value: "Trincomalee", label: "Trincomalee" }, { value: "Kurunegala", label: "Kurunegala" },
    { value: "Puttalam", label: "Puttalam" }, { value: "Anuradhapura", label: "Anuradhapura" },
    { value: "Polonnaruwa", label: "Polonnaruwa" }, { value: "Badulla", label: "Badulla" },
    { value: "Monaragala", label: "Monaragala" }, { value: "Ratnapura", label: "Ratnapura" },
    { value: "Kegalle", label: "Kegalle" },
  ];

  return (
    <div className="aranya" data-screen-label="Checkout" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <CheckoutHeader market={market} onMarket={setMarket} />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 40px 90px" }}>
        <Link href="/products" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--muted)", textDecoration: "none", marginBottom: 22 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back to shopping
        </Link>
        <h1 className="disp" style={{ fontSize: 44, color: "var(--brand)", margin: "0 0 26px", lineHeight: 1.02 }}>Checkout</h1>
        <div className="ck-cols">
          <div>
            {/* ── 1. Contact ─────────────────────────────── */}
            <Section n="1" title="Contact" sub="We'll send your order confirmation and tracking here.">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                <Field label="Email" type="email" ph="you@example.com" value={email} onChange={setEmail} required />
                <Field label="Phone" type="tel" ph={market === "local" ? "07X XXX XXXX" : "+1 555 000 0000"} value={phone} onChange={setPhone} />
              </div>
              {!user && (
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", margin: "14px 0 0" }}>
                  Have an account?{" "}
                  <button onClick={() => cart.openSignIn()} style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--brand)", fontWeight: 700, fontFamily: "var(--font-ui)", fontSize: 12.5 }}>Sign in</button>
                  {" "}for a faster checkout — or continue as a guest.
                </p>
              )}
            </Section>

            {/* ── 2. Shipping address ─────────────────────── */}
            <Section n="2" title="Shipping address">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                <Field label="First name" ph="First" value={firstName} onChange={setFirstName} half required />
                <Field label="Last name" ph="Last" value={lastName} onChange={setLastName} half />
                <Field label="Address" ph="Street address" value={line1} onChange={setLine1} required />
                <Field label="Apartment, suite (optional)" ph="Apt, unit, etc." value={line2} onChange={setLine2} />
                <Field label="City" ph="City" value={city} onChange={setCity} half required />
                {market === "local" ? (
                  <>
                    <SelectField label="District" value={region} onChange={setRegion} options={localDistricts} half />
                    <Field label="Postal code" ph="Postal code" value={postalCode} onChange={setPostalCode} half />
                  </>
                ) : (
                  <>
                    <Field label="State / Region" ph="State" value={region} onChange={setRegion} half />
                    <Field label="Postal code" ph="ZIP / postal" value={postalCode} onChange={setPostalCode} half />
                    <SelectField label="Country" value={country} onChange={setCountry} options={INTL_COUNTRIES} />
                  </>
                )}
              </div>
            </Section>

            {/* ── 3. Delivery method ──────────────────────── */}
            <Section n="3" title="Delivery method">
              <DeliveryOptions market={market} value={deliv} onChange={setDeliv} standardLabel={standardLabel} />
            </Section>

            {/* ── 4. Payment ──────────────────────────────── */}
            <Section n="4" title="Payment" sub="All transactions are encrypted and secure.">
              {market === "local" ? (
                <div style={{ padding: "14px 16px", border: "1.5px solid var(--brand)", borderRadius: 9, background: "rgba(15,110,86,.04)" }}>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>PayHere — cards &amp; mobile banking</div>
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", margin: 0 }}>
                    You will be securely redirected to PayHere to complete payment with Visa, Mastercard, or online banking.
                  </p>
                </div>
              ) : (
                <div style={{ padding: "14px 16px", border: "1.5px solid var(--brand)", borderRadius: 9, background: "rgba(15,110,86,.04)" }}>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    Stripe — secure card payment
                    <span style={{ display: "inline-flex", gap: 5 }}>{["#1A1F71", "#EB001B", "#006FCF"].map((c, k) => <span key={k} style={{ width: 28, height: 18, borderRadius: 3, background: c, opacity: 0.9 }} />)}</span>
                  </div>
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", margin: 0 }}>
                    Your card details are handled directly by Stripe — we never see or store them.
                    {!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
                      <span style={{ display: "block", marginTop: 6, color: "#b45309" }}>
                        (Stripe test keys not configured — set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable card capture.)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </Section>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 16px", marginBottom: 14, fontFamily: "var(--font-ui)", fontSize: 13.5, color: "#b91c1c" }}>
                {error}
              </div>
            )}

            <button
              className={market === "local" ? "btn btn-local" : "btn btn-intl"}
              onClick={placeOrder}
              disabled={placing}
              style={{ marginTop: 4, opacity: placing ? 0.75 : 1 }}
            >
              {placing ? "Placing your order…" : `Place order — ${totalLabel}`}
            </button>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", textAlign: "center", margin: "12px 0 0" }}>
              By placing your order you agree to our terms &amp; privacy policy.
            </p>
          </div>

          <OrderSummary deliv={deliv} expressFee={expressFee} />
        </div>
      </div>
    </div>
  );
}
