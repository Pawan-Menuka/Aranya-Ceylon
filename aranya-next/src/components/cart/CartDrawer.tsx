"use client";

import * as React from "react";
import Link from "next/link";
import { SpicePhoto } from "../primitives/SpicePhoto";
import { Seal } from "../primitives/Seal";
import type { CartLine } from "@/lib/cart";
import { useCart } from "../CartContext";
import { useMarket } from "../MarketContext";

// Slide-in cart drawer (ported from cart-ui.jsx CartDrawer). Reads the cart +
// market from context; the bag icon / add-to-cart open it.

function LineThumb({ item, size = 62 }: { item: CartLine; size?: number }) {
  return (
    <div style={{ width: size, height: size, flex: "0 0 auto", borderRadius: 7, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)" }}>
      <SpicePhoto spice={item} ratio="1 / 1" label={false} />
    </div>
  );
}

function MiniQty({ item }: { item: CartLine }) {
  const cart = useCart();
  const b = (t: string, fn: () => void, dis: boolean) => (
    <button onClick={fn} disabled={dis} aria-label={t === "−" ? "Decrease" : "Increase"} style={{ width: 30, height: 32, border: 0, background: "none", cursor: dis ? "default" : "pointer", fontFamily: "var(--font-ui)", fontSize: 16, color: dis ? "var(--line)" : "var(--ink)", lineHeight: 1 }}>{t}</button>
  );
  return (
    <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--line)", borderRadius: 6, background: "#fff" }}>
      {b("−", () => cart.dec(item.id), item.qty <= 1)}
      <span style={{ width: 24, textAlign: "center", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700 }}>{item.qty}</span>
      {b("+", () => cart.inc(item.id), false)}
    </div>
  );
}

function Row({ label, val, accent }: { label: string; val: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-ui)", fontSize: 13.5 }}>
      <span style={{ color: "var(--muted)", fontWeight: 500 }}>{label}</span>
      <span style={{ color: accent ? "var(--brand)" : "var(--ink)", fontWeight: 700 }}>{val}</span>
    </div>
  );
}

export function CartDrawer() {
  const cart = useCart();
  const { market } = useMarket();
  const open = cart.open;
  const onClose = cart.closeCart;
  const items = cart.items;
  const t = cart.totals;
  const accent = market === "local" ? "var(--brand)" : "var(--accent)";
  const [promoInput, setPromoInput] = React.useState("");
  const [promoErr, setPromoErr] = React.useState(false);
  const [showNote, setShowNote] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const pct = t.freeShip ? 100 : Math.min(100, (1 - t.remainingToFree / t.freeShipThreshold) * 100);
  const cfg = cart.config();

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(20,16,12,.46)", backdropFilter: "blur(2px)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .3s" }} />
      <aside className="aranya" style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 121, width: "min(440px, 100vw)", background: "var(--bg)", boxShadow: "-18px 0 50px rgba(0,0,0,.25)", transform: `translateX(${open ? 0 : 100}%)`, transition: "transform .36s cubic-bezier(.4,0,.2,1)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 className="disp" style={{ fontSize: 26, color: "var(--ink)", margin: 0 }}>Your Basket</h2>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>{cart.count} {cart.count === 1 ? "item" : "items"}</span>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: 0, cursor: "pointer", padding: 4 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
            {cart.marketCleared && (
              <div role="status" style={{ marginBottom: 22, padding: "11px 14px", borderRadius: 9, background: "rgba(186,117,23,.1)", border: "1px solid rgba(186,117,23,.35)", color: "var(--accent)", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, maxWidth: 300, lineHeight: 1.5 }}>
                Your basket was emptied because you switched stores — prices differ between the international and local stores.
              </div>
            )}
            <div style={{ opacity: 0.5, marginBottom: 18 }}><Seal size={64} /></div>
            <h3 className="disp" style={{ fontSize: 25, color: "var(--ink)", margin: "0 0 8px" }}>Your basket is empty</h3>
            <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: "0 0 22px", maxWidth: 280 }}>Fresh-milled spice, sealed at peak aroma — start with a hill-country bestseller.</p>
            <Link href="/products" onClick={onClose} className={market === "local" ? "btn btn-local" : "btn btn-intl"} style={{ width: "auto", padding: "13px 30px", textDecoration: "none" }}>Browse spices</Link>
          </div>
        ) : (
          <>
            <div style={{ padding: "16px 24px 14px", background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink)", marginBottom: 8, fontWeight: 600 }}>
                {t.freeShip ? (
                  <span style={{ color: "var(--brand)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    You&rsquo;ve unlocked free shipping
                  </span>
                ) : (
                  <span>Add <b style={{ color: accent }}>{t.fmt(t.remainingToFree)}</b> more for free shipping</span>
                )}
              </div>
              <div style={{ height: 6, borderRadius: 999, background: "rgba(26,26,26,.08)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", borderRadius: 999, background: accent, transition: "width .35s" }} />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px 24px" }}>
              {items.map((it) => (
                <div key={it.id} style={{ display: "flex", gap: 14, padding: "16px 0", borderBottom: "1px solid var(--line)" }}>
                  <LineThumb item={it} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <h4 className="disp" style={{ fontSize: 19, color: "var(--ink)", margin: 0, lineHeight: 1.12 }}>{it.name}</h4>
                      <button onClick={() => cart.remove(it.id)} aria-label="Remove" style={{ background: "none", border: 0, cursor: "pointer", padding: 2, flex: "0 0 auto", height: 22 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                      </button>
                    </div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", fontWeight: 600, letterSpacing: ".03em", margin: "3px 0 11px" }}>{it.weight} · {it.form}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <MiniQty item={it} />
                      <span className="disp" style={{ fontSize: 21, color: "var(--ink)", fontWeight: 600 }}>{cart.fmt(cart.linePrice(it))}</span>
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ padding: "18px 0 8px", display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }}>
                  <span onClick={() => cart.setGiftWrap(!cart.giftWrap)} style={{ width: 19, height: 19, flex: "0 0 auto", borderRadius: 5, border: cart.giftWrap ? "none" : "1.5px solid var(--line)", background: cart.giftWrap ? "var(--brand)" : "#fff", display: "grid", placeItems: "center" }}>
                    {cart.giftWrap && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                  </span>
                  <span onClick={() => cart.setGiftWrap(!cart.giftWrap)} style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink)", fontWeight: 600, flex: 1 }}>Add gift wrapping</span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>+{cart.fmt(cfg.giftWrap)}</span>
                </label>
                {cart.giftWrap && (
                  !showNote ? (
                    <button onClick={() => setShowNote(true)} style={{ alignSelf: "flex-start", background: "none", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, color: "var(--brand)", textDecoration: "underline", textUnderlineOffset: 3, paddingLeft: 30 }}>+ Add a gift note</button>
                  ) : (
                    <textarea value={cart.giftNote} onChange={(e) => cart.setGiftNote(e.target.value)} placeholder="Write your gift note…" rows={2} style={{ marginLeft: 30, fontFamily: "var(--font-read)", fontSize: 14, color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 7, padding: "10px 12px", resize: "vertical", background: "#fff", outline: "none" }} />
                  )
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={promoInput} onChange={(e) => { setPromoInput(e.target.value); setPromoErr(false); }} placeholder="Promo code" style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink)", border: promoErr ? "1px solid #C0531F" : "1px solid var(--line)", borderRadius: 7, padding: "10px 12px", background: "#fff", outline: "none", textTransform: "uppercase" }} />
                  <button onClick={async () => { const ok = await cart.applyPromo(promoInput); if (!ok) setPromoErr(true); }} style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--ink)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 7, padding: "0 16px", cursor: "pointer" }}>Apply</button>
                </div>
                {cart.promo && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--brand)", fontWeight: 600 }}>
                      {t.discountRate > 0
                        ? `Code ${cart.promo} applied — ${Math.round(t.discountRate * 100)}% off`
                        : `Code ${cart.promo} applied — discount shown at checkout`}
                    </div>
                    <button onClick={() => cart.clearPromo()} style={{ flex: "0 0 auto", background: "none", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, color: "var(--muted)", textDecoration: "underline", textUnderlineOffset: 3 }}>Remove</button>
                  </div>
                )}
                {promoErr && <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "#C0531F", fontWeight: 600, marginTop: -6 }}>That code isn&rsquo;t valid. Try CEYLON10.</div>}
              </div>
            </div>

            <div style={{ padding: "18px 24px 22px", borderTop: "1px solid var(--line)", background: "var(--surface)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
                <Row label="Subtotal" val={t.fmt(t.subtotal)} />
                {t.discount > 0 && <Row label={"Discount (" + cart.promo + ")"} val={"−" + t.fmt(t.discount)} accent />}
                {t.gift > 0 && <Row label="Gift wrapping" val={t.fmt(t.gift)} />}
                <Row label="Shipping" val={t.freeShip ? "Free" : t.fmt(t.ship)} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                <span className="disp" style={{ fontSize: 22, color: "var(--ink)", fontWeight: 600 }}>Total</span>
                <span className="disp" style={{ fontSize: 30, color: "var(--ink)", fontWeight: 600 }}>{t.fmt(t.total)}</span>
              </div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", margin: "6px 0 14px", textAlign: "right" }}>
                {market === "local" ? "Inclusive of taxes" : "Duty & taxes calculated at customs"}
              </p>
              <Link href="/checkout" onClick={onClose} className={market === "local" ? "btn btn-local" : "btn btn-intl"} style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                Checkout — {t.fmt(t.total)}
              </Link>
              <button onClick={onClose} style={{ width: "100%", background: "none", border: 0, cursor: "pointer", marginTop: 10, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>Continue shopping</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
