/* Aranya Ceylon — MOBILE Support cluster, part 1: Contact + FAQ bodies + tab strip.
   Reuses SIcon (support-common.jsx). The MobileSupport controller (mobile-support2.jsx)
   wraps these + Shipping in a 3-tab device. Depends on mobile-pages-common.jsx, support-common.jsx,
   home-common.jsx (Eyebrow, Liyawel), shared.jsx. */
const { useState: msUse2 } = React;

/* ---- in-device cluster tab strip ---- */
function MSupportTabs({ active, onPick }) {
  const tabs = [["contact", "Contact"], ["faq", "FAQ"], ["shipping", "Shipping"]];
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "16px 16px 4px" }}>
      <div style={{ display: "inline-flex", gap: 4, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 999, padding: 4 }}>
        {tabs.map(([id, label]) => {
          const on = active === id;
          return <button key={id} onClick={() => onPick(id)} style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, padding: "9px 16px", borderRadius: 999, cursor: "pointer", border: 0,
            background: on ? "var(--brand)" : "transparent", color: on ? "#fff" : "var(--muted)", transition: "background .15s, color .15s" }}>{label}</button>;
        })}
      </div>
    </div>
  );
}

/* ===================== CONTACT ===================== */
const MS_CONTACT = {
  phone: "+94 81 249 0000",
  hours: "Mon–Sat · 9:00–18:00 IST",
  address: ["No. 24, Spice Garden Road", "Kandy 20000, Sri Lanka"],
  emails: [
    ["headset", "Orders & general help", "support@aranyaceylon.com", "Tracking, changes, anything store-related"],
    ["truck", "Wholesale & trade", "trade@aranyaceylon.com", "Bulk pricing, samples, trade accounts"],
    ["spark", "Press & partnerships", "press@aranyaceylon.com", "Media, collaborations, stockist enquiries"],
  ],
};

function MContactBody({ market }) {
  const accent = market === "local" ? "var(--brand)" : "var(--accent)";
  const [done, setDone] = msUse2(false);
  const [ref, setRef] = msUse2("");
  const [f, setF] = msUse2({ name: "", email: "", subject: "", order: "", message: "", consent: false });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const subjects = ["Order help & tracking", "Returns & refunds", "Product question", "Wholesale & trade", "Press & partnerships", "Something else"];
  const channels = [
    ["whatsapp", "WhatsApp us", "+94 81 249 0000", "Fastest reply · within minutes", "Open chat"],
    ["mail", "Email us", "support@aranyaceylon.com", "A real reply within one business day", "Write an email"],
    ["phone", "Call the house", MS_CONTACT.phone, MS_CONTACT.hours, "Call now"],
  ];
  const submit = (e) => { e.preventDefault(); setRef("AC-" + (10000 + Math.floor(Math.random() * 89999))); setDone(true); };
  const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "#fff", fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--ink)", outline: "none", boxSizing: "border-box" };
  const lbl = (t, req) => <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{t}{req && <span style={{ color: accent }}> *</span>}</span>;

  return (
    <div>
      <MPageHero eyebrow="Support" title="We're here to help" lede="A real person in Kandy answers within a business day — reach us however suits you." motif={false} />

      {/* channel cards */}
      <section style={{ padding: "20px 18px 4px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {channels.map(([icon, title, val, note, cta]) => (
            <div key={title} style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: "16px 16px", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, flex: "0 0 auto", display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--line)" }}><SIcon name={icon} size={21} stroke="var(--brand)" /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 className="disp" style={{ fontSize: 19, color: "var(--ink)", margin: 0, lineHeight: 1.1 }}>{title}</h3>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--brand)", margin: "3px 0 2px", wordBreak: "break-word" }}>{val}</div>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", margin: 0, lineHeight: 1.45 }}>{note}</p>
              </div>
              <SIcon name="arrow" size={18} stroke={accent} w={2} />
            </div>
          ))}
        </div>
      </section>

      {/* form */}
      <section style={{ padding: "24px 18px 8px" }}>
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow-md)", padding: "22px 18px" }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "14px 4px" }}>
              <div style={{ width: 58, height: 58, borderRadius: 999, background: accent, display: "grid", placeItems: "center", margin: "0 auto 18px" }}><SIcon name="check" size={28} stroke="#fff" w={2.4} /></div>
              <h3 className="disp" style={{ fontSize: 28, color: "var(--brand)", margin: "0 0 10px", lineHeight: 1.05 }}>Message on its way</h3>
              <p className="prose" style={{ fontSize: 15, color: "var(--ink)", margin: "0 auto 18px", maxWidth: 300 }}>Thank you, {f.name ? f.name.split(" ")[0] : "there"}. Your reference is <b style={{ color: accent }}>{ref}</b>. We'll reply within one business day.</p>
              <button className="btn btn-ghost" style={{ width: "auto", padding: "11px 22px", margin: "0 auto" }} onClick={() => { setDone(false); setF({ name: "", email: "", subject: "", order: "", message: "", consent: false }); }}>Send another</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h2 className="disp" style={{ fontSize: 25, color: "var(--brand)", margin: "0 0 3px", lineHeight: 1.1 }}>Send us a message</h2>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", margin: "0 0 18px" }}>Fields marked <span style={{ color: accent }}>*</span> are required.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{lbl("Your name", true)}<input required value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name" style={inputStyle} /></label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{lbl("Email", true)}<input required type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" style={inputStyle} /></label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{lbl("What's it about?", true)}
                  <select required value={f.subject} onChange={(e) => set("subject", e.target.value)} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
                    <option value="" disabled>Choose a topic</option>
                    {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{lbl("Order number", false)}<input value={f.order} onChange={(e) => set("order", e.target.value)} placeholder="AC-12345 (if any)" style={inputStyle} /></label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{lbl("Your message", true)}<textarea required value={f.message} onChange={(e) => set("message", e.target.value)} rows={4} placeholder="Tell us what's going on." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}></textarea></label>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" required checked={f.consent} onChange={(e) => set("consent", e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, accentColor: "var(--brand)" }} />
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>Aranya Ceylon may use my details to respond. We never share them.</span>
                </label>
              </div>
              <button type="submit" className="btn" style={{ background: accent, color: "#fff", marginTop: 18, padding: "14px", fontSize: 15 }}>Send message</button>
            </form>
          )}
        </div>
      </section>

      {/* email directory */}
      <section style={{ padding: "24px 18px 8px" }}>
        <Eyebrow>Email the right desk</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 16 }}>
          {MS_CONTACT.emails.map(([icon, title, addr, note]) => (
            <div key={addr} style={{ display: "flex", gap: 13, alignItems: "flex-start", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 13, padding: "15px 15px" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, flex: "0 0 auto", display: "grid", placeItems: "center", background: "#fff", border: "1px solid var(--line)" }}><SIcon name={icon} size={17} stroke="var(--brand)" /></div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{title}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--brand)", fontWeight: 600, margin: "2px 0 3px", wordBreak: "break-word" }}>{addr}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--muted)", lineHeight: 1.45 }}>{note}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* response times */}
      <section style={{ padding: "16px 18px 8px" }}>
        <div style={{ background: "var(--brand)", color: "#FDFAF5", borderRadius: 16, padding: "20px 20px" }}>
          <div className="eyebrow" style={{ color: "#E6B860", marginBottom: 12 }}>Response times</div>
          {[["whatsapp", "WhatsApp", "Minutes, in working hours"], ["mail", "Email", "Within one business day"], ["headset", "Order issues", "Same day, Mon–Sat"]].map(([ic, t, v], i) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: i < 2 ? "1px solid rgba(253,250,245,.16)" : "none" }}>
              <SIcon name={ic} size={17} stroke="#E6B860" />
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 600, flex: 1 }}>{t}</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "rgba(253,250,245,.78)" }}>{v}</span>
            </div>
          ))}
        </div>
      </section>

      {/* visit us */}
      <section style={{ background: "var(--surface)", padding: "36px 18px 8px", marginTop: 24, borderTop: "1px solid var(--line)" }}>
        <Eyebrow>Find us</Eyebrow>
        <h2 className="disp" style={{ fontSize: 27, color: "var(--brand)", margin: "10px 0 14px", lineHeight: 1.05 }}>The spice house in Kandy</h2>
        <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", aspectRatio: "4 / 3", boxShadow: "var(--shadow-md)", border: "1px solid var(--line)", marginBottom: 18 }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(150deg, #2BA982, #0B3C30)" }} />
          <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(253,250,245,.05) 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, rgba(253,250,245,.05) 0 1px, transparent 1px 28px)" }} />
          <div style={{ position: "absolute", left: "50%", top: "46%", transform: "translate(-50%,-100%)", filter: "drop-shadow(0 6px 10px rgba(0,0,0,.3))" }}>
            <div style={{ width: 38, height: 38, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", background: "var(--accent)", display: "grid", placeItems: "center", border: "2px solid #fff" }}>
              <span style={{ transform: "rotate(45deg)", display: "grid", placeItems: "center" }}><SIcon name="leaf" size={16} stroke="#fff" w={2} /></span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 13, paddingBottom: 8 }}>
          {[["pin", MS_CONTACT.address.join(", ")], ["clock", MS_CONTACT.hours], ["phone", MS_CONTACT.phone]].map(([ic, t]) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, flex: "0 0 auto", display: "grid", placeItems: "center", background: "#fff", border: "1px solid var(--line)" }}><SIcon name={ic} size={17} stroke="var(--brand)" /></div>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>{t}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ===================== FAQ ===================== */
const MS_FAQ = [
  { id: "orders", name: "Orders", icon: "receipt", items: [
    ["How do I place an order?", "Browse the shop, choose a weight and whole or ground for each spice, and add to bag. At checkout you can pay as a guest or sign in — you'll get an email confirmation with your order number the moment it's placed."],
    ["Can I change or cancel an order?", "We mill and pack to order, usually within a few hours, so reach us quickly. If your order hasn't entered packing we can edit or cancel it — message or WhatsApp us with your order number."],
    ["Do I need an account to buy?", "No — guest checkout is always available. An account simply saves your addresses, lets you reorder in a tap, and keeps your order history and tracking in one place."],
    ["I didn't receive a confirmation email.", "Check spam or promotions first. If it's not there within 15 minutes the email may have a typo — contact us with your name and the rough order time and we'll resend it."],
  ] },
  { id: "shipping", name: "Shipping", icon: "truck", items: [
    ["Where do you ship?", "Across Sri Lanka and to 40+ countries worldwide. Domestic orders dispatch from Kandy; international orders ship tracked and insured."],
    ["How long will my order take?", "Within Sri Lanka, 2–4 working days (1–2 for Colombo express). International standard runs 7–14 working days, express 3–6, depending on destination and customs."],
    ["When is shipping free?", "Domestic orders over Rs 5,000 ship free; international orders over $60 ship free. Below that, a flat rate is shown at checkout before you pay."],
    ["Will I be charged customs or duties?", "International parcels may attract import duties set by your country — these are the recipient's responsibility and aren't included in our prices."],
  ] },
  { id: "products", name: "Products", icon: "leaf", items: [
    ["Are your spices organic and certified?", "Every lot is single-origin and traceable to a named Sri Lankan estate, with Geographical Indication paperwork and EU/USDA organic certificates on file. Certification varies by spice — noted on each product page."],
    ["Whole or ground — which should I buy?", "Whole spices keep their aroma far longer, so for anything you'll use over months, buy whole and grind as needed. Ground is milled fresh to order for convenience."],
    ["How should I store my spices?", "Keep them sealed, cool, dark and dry — away from the stove and direct sun. Our pouches are resealable; for long-term storage, decant into airtight jars."],
    ["What's the shelf life?", "Whole spices stay vivid for 2–3 years, ground for around a year, stored well. We date every lot and ship at peak aroma."],
  ] },
  { id: "payments", name: "Payments", icon: "shield", items: [
    ["What payment methods do you accept?", "International orders are processed securely (Visa, Mastercard, Amex and more) in USD. Sri Lankan orders are handled in LKR, supporting local cards and bank options."],
    ["Is checkout secure?", "Always. Payments run over 256-bit SSL — we never see or store your full card details on our servers."],
    ["What currency am I charged in?", "It follows your selected market: USD for International, LKR for Sri Lanka. Switch markets anytime and prices update across the site."],
  ] },
  { id: "returns", name: "Returns", icon: "refresh", items: [
    ["What is your return policy?", "Because spice is consumable, we accept returns on unopened, sealed items within 30 days of delivery for a refund — just get in touch first to start it."],
    ["My order arrived damaged or leaking.", "We're sorry — send a photo within 7 days and we'll ship a free replacement or refund the affected items, no return needed."],
    ["How long do refunds take?", "Once approved, refunds go back to your original payment method within 2 business days, and usually appear within 5–10 days."],
    ["Can I return opened spice?", "We can't resell opened food, so opened items aren't returnable for change-of-mind. But if the quality fell short, reach out — we stand behind every lot."],
  ] },
];

function MFAQItem({ q, a, open, onToggle }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "16px 16px", background: "none", border: 0, cursor: "pointer", textAlign: "left" }}>
        <span className="disp" style={{ fontSize: 18, color: "var(--ink)", lineHeight: 1.18 }}>{q}</span>
        <span style={{ flex: "0 0 auto", transform: open ? "rotate(180deg)" : "none", transition: "transform .25s" }}><SIcon name="chevron" size={18} stroke="var(--brand)" /></span>
      </button>
      <div style={{ maxHeight: open ? 360 : 0, overflow: "hidden", transition: "max-height .3s ease" }}>
        <p className="prose" style={{ fontSize: 14.5, color: "var(--muted)", margin: 0, padding: "0 16px 18px", lineHeight: 1.65 }}>{a}</p>
      </div>
    </div>
  );
}

function MFAQBody({ market }) {
  const [cat, setCat] = msUse2("orders");
  const [open, setOpen] = msUse2("orders-0");
  const active = MS_FAQ.find((c) => c.id === cat);
  return (
    <div>
      <MPageHero eyebrow="Support · FAQ" title="Questions, answered" lede="Everything about orders, shipping, our spices, payments and returns — in one place." motif={false} />
      {/* category chips */}
      <div className="noscroll" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "18px 18px 8px" }}>
        {MS_FAQ.map((c) => {
          const on = c.id === cat;
          return <button key={c.id} onClick={() => { setCat(c.id); setOpen(c.id + "-0"); }} style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, padding: "9px 15px", borderRadius: 999, cursor: "pointer",
            border: on ? "1px solid var(--brand)" : "1px solid var(--line)", background: on ? "var(--brand)" : "#fff", color: on ? "#fff" : "var(--muted)" }}>
            <SIcon name={c.icon} size={15} stroke={on ? "#fff" : "var(--brand)"} />{c.name}
          </button>;
        })}
      </div>
      <section style={{ padding: "16px 18px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--line)" }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--line)", flex: "0 0 auto" }}><SIcon name={active.icon} size={19} stroke="var(--brand)" /></span>
          <h2 className="disp" style={{ fontSize: 27, color: "var(--brand)", margin: 0, lineHeight: 1.05 }}>{active.name}</h2>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", fontWeight: 600, marginLeft: "auto" }}>{active.items.length} questions</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {active.items.map(([q, a], i) => {
            const key = active.id + "-" + i;
            return <MFAQItem key={key} q={q} a={a} open={open === key} onToggle={() => setOpen(open === key ? "" : key)} />;
          })}
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { MSupportTabs, MContactBody, MFAQBody });
