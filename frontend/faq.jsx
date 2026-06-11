/* Aranya Ceylon — FAQ page sections.
   Categorized accordions with a sticky category rail + scroll-spy.
   Depends on support-common.jsx (SIcon), home-common.jsx (Reveal, Eyebrow). Exports FAQBody. */
const { useState: fState, useEffect: fEffect, useRef: fRef } = React;

const FAQ_CATS = [
  {
    id: "orders", name: "Orders", icon: "receipt",
    items: [
      ["How do I place an order?", "Browse the shop, choose a weight and whole or ground for each spice, and add to bag. When you're ready, head to checkout — you can pay as a guest or sign in. You'll get an email confirmation with your order number the moment it's placed."],
      ["Can I change or cancel an order after placing it?", "We mill and pack to order, usually within a few hours, so reach us quickly. If your order hasn't entered packing we can edit or cancel it — message support@aranyaceylon.com or WhatsApp us with your order number and we'll sort it."],
      ["Do I need an account to buy?", "No — guest checkout is always available. An account simply saves your addresses, lets you reorder in a tap, and keeps your order history and tracking in one place."],
      ["I didn't receive an order confirmation email.", "Check your spam or promotions folder first. If it's not there within 15 minutes, the email may have a typo — contact us with your name and the rough order time and we'll resend it."],
    ],
  },
  {
    id: "shipping", name: "Shipping", icon: "truck",
    items: [
      ["Where do you ship?", "Across Sri Lanka and to 40+ countries worldwide. Domestic orders are dispatched from Kandy; international orders ship tracked and insured. Full rates and timings live on our Shipping & Returns page."],
      ["How long will my order take?", "Within Sri Lanka, expect 2–4 working days (1–2 for Colombo express). International standard runs 7–14 working days, express 3–6, depending on destination and customs."],
      ["When is shipping free?", "Domestic orders over Rs 5,000 ship free; international orders over $60 ship free. Below that, a flat rate is shown at checkout before you pay."],
      ["Will I be charged customs or duties?", "International parcels may attract import duties or taxes set by your country — these are the recipient's responsibility and aren't included in our prices. See the Shipping & Returns page for details."],
    ],
  },
  {
    id: "products", name: "Products", icon: "leaf",
    items: [
      ["Are your spices organic and certified?", "Every lot is single-origin and traceable to a named Sri Lankan estate, with Geographical Indication paperwork and EU/USDA organic certificates on file. Certification varies by spice — it's noted on each product page."],
      ["Whole or ground — which should I buy?", "Whole spices keep their aroma far longer, so for anything you'll use over months, buy whole and grind as needed. Ground is milled fresh to order for convenience; use it within a few months for the best flavour."],
      ["How should I store my spices?", "Keep them sealed, cool, dark and dry — away from the stove and direct sun. Our pouches are resealable; for long-term storage, decant into airtight jars. Avoid the fridge, which introduces moisture."],
      ["What's the shelf life?", "Whole spices stay vivid for 2–3 years, ground for around a year, stored well. We date every lot and ship at peak aroma rather than from long-term storage, so you start the clock fresh."],
      ["Are your products single-origin?", "Yes — we never blend across origins. Each spice comes from one harvest on one estate, which is why aroma and character stay consistent within a lot."],
    ],
  },
  {
    id: "payments", name: "Payments", icon: "shield",
    items: [
      ["What payment methods do you accept?", "International orders are processed securely by Stripe (Visa, Mastercard, Amex and more) in USD. Sri Lankan orders are handled by PayHere in LKR, supporting local cards and bank options."],
      ["Is checkout secure?", "Always. Payments run over 256-bit SSL through Stripe and PayHere — we never see or store your full card details on our servers."],
      ["What currency am I charged in?", "It follows your selected market: USD for International, LKR for Sri Lanka. You can switch markets anytime using the toggle, and prices update across the site."],
      ["Do you accept promo codes or gift cards?", "Yes — enter a valid promo code in the cart and the discount applies before checkout. Digital gift cards are available seasonally; watch the Harvest List for announcements."],
    ],
  },
  {
    id: "returns", name: "Returns", icon: "refresh",
    items: [
      ["What is your return policy?", "Because spice is a consumable, we accept returns on unopened, sealed items within 30 days of delivery. If something isn't right with an opened item, contact us — we'll always make it fair."],
      ["My order arrived damaged or leaking.", "We're sorry — send a photo to support@aranyaceylon.com within 7 days of delivery and we'll ship a free replacement or refund the affected items, no return needed."],
      ["I received the wrong item.", "Our mistake to fix. Message us with your order number and a photo of what arrived, and we'll get the correct spice on its way and sort the return at our cost."],
      ["How long do refunds take?", "Once approved, refunds are issued to your original payment method within 2 business days and typically appear within 5–10 days, depending on your bank or card provider."],
      ["Can I return opened spice?", "We can't resell opened food, so opened items aren't returnable for change-of-mind. But if the quality fell short of what you expected, reach out — we stand behind every lot."],
    ],
  },
];

/* ---- single accordion row ---- */
function FAQItem({ q, a, open, onToggle }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "20px 24px", background: "none", border: 0, cursor: "pointer", textAlign: "left" }}>
        <span className="disp" style={{ fontSize: 21, color: "var(--ink)", lineHeight: 1.18 }}>{q}</span>
        <span style={{ flex: "0 0 auto", transform: open ? "rotate(180deg)" : "none", transition: "transform .25s" }}><SIcon name="chevron" size={20} stroke="var(--brand)" /></span>
      </button>
      <div style={{ maxHeight: open ? 320 : 0, overflow: "hidden", transition: "max-height .32s ease" }}>
        <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: 0, padding: "0 24px 22px", lineHeight: 1.7 }}>{a}</p>
      </div>
    </div>
  );
}

/* ---- sticky category rail ---- */
function FAQRail({ active, onJump }) {
  return (
    <nav style={{ position: "sticky", top: 130, display: "flex", flexDirection: "column", gap: 4 }}>
      <div className="eyebrow" style={{ color: "var(--muted)", marginBottom: 14, paddingLeft: 14 }}>Browse topics</div>
      {FAQ_CATS.map((c) => {
        const on = c.id === active;
        return (
          <button key={c.id} onClick={() => onJump(c.id)} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 11, cursor: "pointer", textAlign: "left",
            background: on ? "var(--surface)" : "transparent", border: on ? "1px solid var(--line)" : "1px solid transparent",
            transition: "background .15s",
          }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, flex: "0 0 auto", display: "grid", placeItems: "center", background: on ? "var(--brand)" : "var(--surface)", border: on ? "none" : "1px solid var(--line)", transition: "background .15s" }}>
              <SIcon name={c.icon} size={17} stroke={on ? "#fff" : "var(--brand)"} />
            </span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: on ? 700 : 600, color: on ? "var(--ink)" : "var(--muted)", flex: 1 }}>{c.name}</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, color: on ? "var(--accent)" : "#A99E8C" }}>{c.items.length}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ---- main two-column body ---- */
function FAQBody({ market }) {
  const [active, setActive] = fState("orders");
  const [open, setOpen] = fState("orders-0");
  const lock = fRef(false);

  const jump = (id) => {
    const el = document.getElementById("faq-" + id);
    if (!el) return;
    lock.current = true;
    setActive(id);
    const y = el.getBoundingClientRect().top + window.scrollY - 122;
    window.scrollTo({ top: y, behavior: "smooth" });
    setTimeout(() => { lock.current = false; }, 700);
  };

  fEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf || lock.current) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        let cur = FAQ_CATS[0].id;
        for (const c of FAQ_CATS) {
          const el = document.getElementById("faq-" + c.id);
          if (el && el.getBoundingClientRect().top <= 160) cur = c.id;
        }
        setActive(cur);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section style={{ background: "var(--bg)", padding: "64px 0 96px" }}>
      <div className="home-section-pad faq-body" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "260px 1fr", gap: 56, alignItems: "start" }}>
        <div className="faq-rail"><FAQRail active={active} onJump={jump} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
          {FAQ_CATS.map((c) => (
            <div key={c.id} id={"faq-" + c.id} style={{ scrollMarginTop: 122 }}>
              <Reveal>
                <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 22, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
                  <span style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--line)", flex: "0 0 auto" }}><SIcon name={c.icon} size={20} stroke="var(--brand)" /></span>
                  <h2 className="disp" style={{ fontSize: "clamp(28px,3vw,38px)", color: "var(--brand)", margin: 0, lineHeight: 1.05 }}>{c.name}</h2>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", fontWeight: 600, marginLeft: 2, paddingBottom: 2 }}>· {c.items.length} questions</span>
                </div>
              </Reveal>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {c.items.map(([q, a], i) => {
                  const key = c.id + "-" + i;
                  return (
                    <Reveal key={key} delay={Math.min(i, 4) * 40}>
                      <FAQItem q={q} a={a} open={open === key} onToggle={() => setOpen(open === key ? "" : key)} />
                    </Reveal>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { FAQBody });
