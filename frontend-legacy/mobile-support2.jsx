/* Aranya Ceylon — MOBILE Support cluster, part 2: Shipping body, Wholesale page, and the
   MobileSupport 3-tab controller. Depends on mobile-support.jsx (MContactBody, MFAQBody, MSupportTabs),
   mobile-pages-common.jsx, support-common.jsx (SIcon), home-common.jsx, shared.jsx (Seal). */
const { useState: msUse3 } = React;

/* tiny market segmented control */
function MSMarketSeg({ market, setMarket }) {
  const opt = (key, label) => {
    const on = market === key;
    return <button onClick={() => setMarket(key)} style={{ flex: 1, padding: "9px 8px", borderRadius: 9, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, border: 0,
      background: on ? "var(--brand)" : "transparent", color: on ? "#fff" : "var(--muted)", transition: "background .15s, color .15s" }}>{label}</button>;
  };
  return <div style={{ display: "flex", gap: 3, padding: 3, borderRadius: 11, background: "#fff", border: "1px solid var(--line)" }}>{opt("intl", "International · USD")}{opt("local", "Sri Lanka · LKR")}</div>;
}

/* ===================== SHIPPING & RETURNS ===================== */
function MRateCard({ region, currencyNote, freeLine, rows, highlight }) {
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", background: "#fff", border: highlight ? "1.5px solid var(--brand)" : "1px solid var(--line)", borderRadius: 16, boxShadow: highlight ? "var(--shadow-md)" : "var(--shadow-sm)", overflow: "hidden" }}>
      {highlight && <span style={{ position: "absolute", top: 14, right: 14, fontFamily: "var(--font-ui)", fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#fff", background: "var(--brand)", borderRadius: 999, padding: "4px 10px" }}>Your region</span>}
      <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--line)", flex: "0 0 auto" }}><SIcon name={region.icon} size={20} stroke="var(--brand)" /></span>
          <div>
            <h3 className="disp" style={{ fontSize: 22, color: "var(--ink)", margin: 0, lineHeight: 1.1 }}>{region.name}</h3>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{currencyNote}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "4px 20px" }}>
        {rows.map((r, i) => (
          <div key={r[0]} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "baseline", padding: "14px 0", borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none" }}>
            <div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{r[0]}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{r[1]}</div>
            </div>
            <div className="disp" style={{ fontSize: 20, color: "var(--brand)", fontWeight: 600, whiteSpace: "nowrap" }}>{r[2]}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "14px 20px", background: "var(--surface)", borderTop: "1px solid var(--line)" }}>
        <SIcon name="spark" size={16} stroke="var(--accent)" />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{freeLine}</span>
      </div>
    </div>
  );
}

function MShippingBody({ market: market0 = "intl" }) {
  const [market, setMarket] = msUse3(market0);
  const local = market === "local";
  const domestic = { region: { name: "Within Sri Lanka", icon: "pin" }, currencyNote: "Dispatched from Kandy · LKR", freeLine: "Free standard delivery over Rs 5,000",
    rows: [["Standard · islandwide", "2–4 working days", "Rs 650"], ["Express · Colombo", "1–2 working days", "Rs 950"], ["Store collection · Kandy", "By appointment", "Free"]] };
  const intl = { region: { name: "International", icon: "plane" }, currencyNote: "Tracked & insured · USD", freeLine: "Free standard shipping over $60",
    rows: [["Standard · tracked", "7–14 working days", "$8.50"], ["Express · courier", "3–6 working days", "$24.00"], ["Remote / outlying zones", "Quoted at checkout", "Varies"]] };
  const steps = [
    ["receipt", "Order placed", "An instant confirmation email with your order number."],
    ["leaf", "Milled & packed", "We mill, weigh and seal your spices to order — usually within hours."],
    ["truck", "Dispatched", "Your parcel ships and a tracking link lands in your inbox the same day."],
    ["pin", "Out for delivery", "Follow the tracking link to your door — or our Kandy counter."],
  ];
  const cards = [
    ["refresh", "30-day returns", "Unopened, sealed items can be returned within 30 days of delivery for a refund — just get in touch first."],
    ["shield", "Damaged or wrong item", "Arrived damaged or not what you ordered? Send a photo within 7 days and we'll replace or refund it free."],
    ["receipt", "Refund timing", "Approved refunds go to your original payment method within 2 business days, appearing within 5–10 days."],
  ];
  const rsteps = [["Reach out", "Email or WhatsApp us with your order number and what's wrong."], ["We confirm", "We reply within a business day with instructions, or arrange a replacement."], ["Resolved", "Once we receive or verify the item, your refund or replacement is on its way."]];

  return (
    <div>
      <MPageHero eyebrow="Support · Shipping" title="Shipping & Returns" lede="Rates, delivery times and a fair, human returns policy." motif={false} />

      {/* rates */}
      <section style={{ padding: "20px 18px 8px" }}>
        <div style={{ marginBottom: 18 }}><MSMarketSeg market={market} setMarket={setMarket} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MRateCard {...domestic} highlight={local} />
          <MRateCard {...intl} highlight={!local} />
        </div>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", textAlign: "center", margin: "18px 0 0", lineHeight: 1.6 }}>
          Orders are milled and sealed to order, then dispatched within 1–2 working days. Windows begin at dispatch.
        </p>
      </section>

      {/* tracking */}
      <section style={{ background: "var(--surface)", padding: "36px 18px", marginTop: 24, borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <Eyebrow>Tracking</Eyebrow>
        <h2 className="disp" style={{ fontSize: 27, color: "var(--brand)", margin: "10px 0 22px", lineHeight: 1.05 }}>From our mill to your door</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {steps.map(([ic, t, b], i) => (
            <div key={t} style={{ display: "flex", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto" }}>
                <span style={{ width: 42, height: 42, borderRadius: 11, display: "grid", placeItems: "center", background: "#fff", border: "1px solid var(--line)" }}><SIcon name={ic} size={20} stroke="var(--brand)" /></span>
                {i < steps.length - 1 && <span style={{ width: 1, flex: 1, background: "var(--line)", margin: "6px 0" }} />}
              </div>
              <div style={{ paddingBottom: i < steps.length - 1 ? 6 : 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span className="disp" style={{ fontSize: 20, color: "var(--gold-line)", fontWeight: 600 }}>{"0" + (i + 1)}</span>
                  <h3 className="disp" style={{ fontSize: 20, color: "var(--ink)", margin: 0, lineHeight: 1.1 }}>{t}</h3>
                </div>
                <p className="prose" style={{ fontSize: 14, color: "var(--muted)", margin: "5px 0 0", lineHeight: 1.6 }}>{b}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 13, alignItems: "flex-start", marginTop: 24, padding: "16px 16px", background: "#fff", border: "1px solid var(--line)", borderRadius: 13 }}>
          <span style={{ flex: "0 0 auto", marginTop: 1 }}><SIcon name="globe" size={20} stroke="var(--accent)" /></span>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
            <b style={{ color: "var(--ink)" }}>International duties & taxes.</b> Customs charges are set by the destination country and are the recipient's responsibility — not included in our prices.
          </p>
        </div>
      </section>

      {/* returns */}
      <section style={{ padding: "36px 18px 8px" }}>
        <Eyebrow>Returns & refunds</Eyebrow>
        <h2 className="disp" style={{ fontSize: 27, color: "var(--brand)", margin: "10px 0 6px", lineHeight: 1.05 }}>Fair, simple, human</h2>
        <p className="prose" style={{ fontSize: 14.5, color: "var(--muted)", margin: "0 0 20px" }}>Spice is consumable, so opened items can't be resold — but if the quality ever falls short, we'll make it right.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {cards.map(([ic, t, b]) => (
            <div key={t} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: "18px 18px", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--line)", marginBottom: 13 }}><SIcon name={ic} size={21} stroke="var(--brand)" /></div>
              <h3 className="disp" style={{ fontSize: 21, color: "var(--ink)", margin: "0 0 7px", lineHeight: 1.12 }}>{t}</h3>
              <p className="prose" style={{ fontSize: 14, color: "var(--muted)", margin: 0, lineHeight: 1.62 }}>{b}</p>
            </div>
          ))}
        </div>
        {/* how to start (dark) */}
        <div style={{ background: "#1A1A1A", color: "#FDFAF5", borderRadius: 18, padding: "24px 20px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 120% at 100% 0%, rgba(15,110,86,.24), transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div className="eyebrow" style={{ color: "#E6B860", marginBottom: 8 }}>How to start a return</div>
            <h3 className="disp" style={{ fontSize: 25, margin: "0 0 22px", fontWeight: 600, lineHeight: 1.08 }}>Three steps, a real person on the other end</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {rsteps.map(([t, b], i) => (
                <div key={t} style={{ display: "flex", gap: 13 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 999, display: "grid", placeItems: "center", background: "#E6B860", color: "#1A1A1A", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 800, flex: "0 0 auto" }}>{i + 1}</span>
                  <div>
                    <div className="disp" style={{ fontSize: 19, color: "#FDFAF5", lineHeight: 1.1 }}>{t}</div>
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "rgba(253,250,245,.78)", margin: "4px 0 0", lineHeight: 1.55 }}>{b}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className={local ? "btn btn-local" : "btn btn-intl"} style={{ marginTop: 22, padding: "13px", fontSize: 14.5 }}>Start a return</button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ===================== SUPPORT CONTROLLER (3-tab) ===================== */
function MobileSupport({ market = "intl", initialTab = "contact" }) {
  const [tab, setTab] = msUse3(initialTab);
  const title = tab === "contact" ? "Contact" : tab === "faq" ? "FAQ" : "Shipping & Returns";
  return (
    <div style={{ minHeight: "100%", background: "var(--bg)" }}>
      <MPageBar title="Support" onBack={() => {}} />
      <MSupportTabs active={tab} onPick={setTab} />
      {tab === "contact" && <MContactBody market={market} />}
      {tab === "faq" && <MFAQBody market={market} />}
      {tab === "shipping" && <MShippingBody market={market} />}
      <div style={{ height: 20 }} />
      <MPageFooter market={market} />
    </div>
  );
}

/* ===================== WHOLESALE ===================== */
function MWIcon({ name, size = 22, stroke = "var(--brand)", w = 1.6 }) {
  const p = {
    utensils: <><path d="M5 3v8a2 2 0 0 0 4 0V3M7 11v10" /><path d="M17 3c-1.7 0-3 2-3 5s1.3 4 3 4m0 0v9m0-9c1.7 0 3-1 3-4s-1.3-5-3-5z" /></>,
    store: <><path d="M4 9l1.2-5h13.6L20 9M4 9h16M4 9v11h16V9M9 20v-6h6v6" /><path d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" /></>,
    coffee: <><path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" /><path d="M17 9h2.5a2.5 2.5 0 0 1 0 5H17" /></>,
    basket: <><path d="M5 9l3-5M19 9l-3-5" /><path d="M3 9h18l-1.5 9.5A2 2 0 0 1 17.5 20h-11a2 2 0 0 1-2-1.5L3 9z" /><path d="M9 13v3M15 13v3" /></>,
    factory: <><path d="M3 21V9l6 4V9l6 4V5h6v16H3z" /><path d="M7 21v-4M12 21v-4M17 21v-4" /></>,
    certificate: <><path d="M12 3l2.4 1.6 2.8-.4 1 2.7 2.3 1.7-.9 2.7.9 2.7-2.3 1.7-1 2.7-2.8-.4L12 21l-2.4-1.6-2.8.4-1-2.7L3.5 15.4l.9-2.7-.9-2.7 2.3-1.7 1-2.7 2.8.4L12 3z" /><path d="M9 12l2 2 4-4" /></>,
    truck: <><path d="M2 6h12v10H2zM14 9h4l3 3v4h-7z" /><circle cx="6.5" cy="18" r="1.8" /><circle cx="17.5" cy="18" r="1.8" /></>,
    label: <><path d="M20.6 13.4L13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6z" /><circle cx="7.5" cy="7.5" r="1.4" /></>,
    leaf: <><path d="M11 21C5 18 4 9 20 4c1 9-3 16-12 14-2-4 1-9 7-11" /></>,
    check: <path d="M5 12l5 5L20 6" />, chevron: <path d="M6 9l6 6 6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    box: <><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7M12 11v10" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  }[name];
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>{p}</svg>;
}

function MWFAQItem({ q, a, open, onToggle }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "16px 16px", background: "none", border: 0, cursor: "pointer", textAlign: "left" }}>
        <span className="disp" style={{ fontSize: 18, color: "var(--ink)", lineHeight: 1.15 }}>{q}</span>
        <span style={{ flex: "0 0 auto", transform: open ? "rotate(180deg)" : "none", transition: "transform .25s" }}><MWIcon name="chevron" size={18} stroke="var(--brand)" /></span>
      </button>
      <div style={{ maxHeight: open ? 300 : 0, overflow: "hidden", transition: "max-height .3s ease" }}>
        <p className="prose" style={{ fontSize: 14.5, color: "var(--muted)", margin: 0, padding: "0 16px 18px", lineHeight: 1.65 }}>{a}</p>
      </div>
    </div>
  );
}

function MobileWholesale({ market = "intl" }) {
  const accent = market === "local" ? "var(--brand)" : "var(--accent)";
  const local = market === "local";
  const [done, setDone] = msUse3(false);
  const [ref, setRef] = msUse3("");
  const [f, setF] = msUse3({ company: "", contact: "", email: "", country: "", type: "", volume: "", message: "", consent: false });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const [open, setOpen] = msUse3(0);

  const stats = [["5 kg", "Lowest MOQ per spice"], ["48 hrs", "Application review"], ["40+", "Countries shipped"], ["GI", "Certified single-origin"]];
  const why = [
    ["certificate", "Single-origin & GI-certified", "Every lot traces to a named Sri Lankan estate, with GI paperwork and organic certificates on file for your compliance team."],
    ["leaf", "Harvest-fresh, even in bulk", "We mill and seal to order rather than from a warehouse — so a 25 kg sack arrives as aromatic as our retail pouches."],
    ["label", "Flexible MOQs & private label", "Start at just 5 kg per spice. Scale into custom blends, your own labelling, and bespoke pack sizes."],
    ["truck", "Tracked, insured logistics", "Consolidated freight to 40+ countries, fully tracked and insured, with local and international settlement."],
  ];
  const who = [
    ["utensils", "Restaurants & hotels"], ["store", "Specialty retailers"], ["coffee", "Cafés & roasters"], ["basket", "Online grocers"], ["factory", "Food manufacturers"],
  ];
  const steps = [
    ["01", "Apply", "Tell us about your business and what you're looking for. Two minutes."],
    ["02", "We review", "Our trade team replies within two business days with pricing and next steps."],
    ["03", "Taste a sample box", "We send a curated sample box of relevant lots, so you buy on aroma."],
    ["04", "Onboard & order", "Approved accounts get a price list, terms, and a dedicated contact."],
  ];
  const tiers = [
    { name: "Trade Starter", tag: "Cafés, small kitchens & boutiques", moq: "5 kg", save: "Up to 20% off retail", features: ["From 5 kg per spice", "Retail or bulk packaging", "Card / online checkout", "Reorder anytime"], featured: false },
    { name: "Trade", tag: "Restaurants, retailers & roasters", moq: "25 kg", save: "Up to 30% off retail", features: ["From 25 kg per spice", "Net-30 on approval", "Priority allocation", "Dedicated contact", "Quarterly samples"], featured: true },
    { name: "Distributor", tag: "Manufacturers & national accounts", moq: "Custom", save: "Custom", features: ["Custom volumes & blends", "Your own labelling", "Bespoke logistics", "Account manager"], featured: false },
  ];
  const faqs = [
    ["What's the minimum order?", "Trade accounts start at just 5 kg per spice. There's no minimum number of lines — mix and match across our range to hit your volume."],
    ["How fresh is the spice at bulk volumes?", "We mill and seal to order rather than shipping from long-term storage. For large orders we recommend whole quills and pods, ground to your schedule."],
    ["Do you offer private label or custom blends?", "Yes — from the Trade tier upward we offer your own labelling, custom pack sizes and bespoke blends."],
    ["What payment terms are available?", "Local accounts settle in LKR; international accounts are invoiced in USD. Net-30 terms are available on approval for Trade and above."],
    ["Can I get samples before committing?", "Qualified applicants receive a complimentary sample box of the lots relevant to their business."],
  ];
  const volumeBands = local ? ["Under Rs 300,000", "Rs 300k – 1.5M", "Rs 1.5M – 4.5M", "Rs 4.5M+"] : ["Under $1,000", "$1,000 – $5,000", "$5,000 – $15,000", "$15,000+"];
  const types = ["Restaurant / hotel", "Specialty retailer", "Café / roaster", "Online grocer", "Food manufacturer", "Other"];
  const countries = ["Sri Lanka", "United States", "United Kingdom", "Canada", "Australia", "Germany", "Singapore", "UAE", "Other"];
  const submit = (e) => { e.preventDefault(); setRef("WS-" + (210 + Math.floor(Math.random() * 80))); setDone(true); };
  const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "#fff", fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--ink)", outline: "none", boxSizing: "border-box" };
  const lbl = (t, req) => <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{t}{req && <span style={{ color: accent }}> *</span>}</span>;

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)" }}>
      {/* hero */}
      <header style={{ position: "relative", background: "#161412", color: "#FDFAF5", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 480 }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(150deg, rgba(15,110,86,.4), rgba(11,16,13,.72))" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 60% at 78% 12%, rgba(230,184,96,.14), transparent 55%)" }} />
        <div style={{ position: "relative", zIndex: 2 }}><MPageBar title="Wholesale" onBack={() => {}} /></div>
        <div style={{ position: "relative", marginTop: "auto", padding: "0 22px 32px" }}>
          <Eyebrow light>Wholesale &amp; Trade</Eyebrow>
          <h1 className="disp" style={{ fontSize: "clamp(42px,12vw,56px)", lineHeight: 0.98, margin: "16px 0 0", fontWeight: 600 }}>Ceylon spice,<br />by the <span style={{ fontStyle: "italic", color: "#E6B860" }}>kilo.</span></h1>
          <p className="prose" style={{ fontSize: 15, color: "rgba(253,250,245,.85)", margin: "18px 0 0", maxWidth: 330 }}>
            The same hand-rolled cinnamon and hill-country pepper we sell by the pouch — supplied to the kitchens, roasters and shelves that taste the difference.
          </p>
          <button className={local ? "btn btn-local" : "btn btn-intl"} style={{ marginTop: 24, padding: "14px", fontSize: 15 }}>Apply for a trade account</button>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 0", marginTop: 28, borderTop: "1px solid rgba(253,250,245,.18)", paddingTop: 22 }}>
            {stats.map((s, i) => (
              <div key={s[0]} style={{ flex: "1 1 50%", paddingLeft: i % 2 ? 18 : 0, borderLeft: i % 2 ? "1px solid rgba(253,250,245,.16)" : "none" }}>
                <div className="disp" style={{ fontSize: 30, color: "#E6B860", fontWeight: 600, lineHeight: 1 }}>{s[0]}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "rgba(253,250,245,.72)", marginTop: 6 }}>{s[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* why */}
      <section style={{ padding: "44px 18px 8px" }}>
        <Eyebrow>Why trade with us</Eyebrow>
        <h2 className="disp" style={{ fontSize: 30, color: "var(--brand)", margin: "10px 0 24px", lineHeight: 1.04 }}>Wholesale without the compromise</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {why.map(([icon, title, body]) => (
            <div key={title} style={{ display: "flex", gap: 15 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, flex: "0 0 auto", display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--line)" }}><MWIcon name={icon} size={23} stroke="var(--brand)" /></div>
              <div>
                <h3 className="disp" style={{ fontSize: 21, color: "var(--ink)", margin: "2px 0 7px", lineHeight: 1.1 }}>{title}</h3>
                <p className="prose" style={{ fontSize: 14.5, color: "var(--muted)", margin: 0, lineHeight: 1.62 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* who we supply */}
      <section style={{ background: "var(--surface)", padding: "44px 18px", marginTop: 32, borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <Eyebrow>Who we supply</Eyebrow>
        <h2 className="disp" style={{ fontSize: 28, color: "var(--brand)", margin: "10px 0 20px", lineHeight: 1.04 }}>Built for serious kitchens &amp; shelves</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {who.map(([icon, title], i) => (
            <div key={title} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 16px", boxShadow: "var(--shadow-sm)", gridColumn: i === 4 ? "1 / -1" : "auto" }}>
              <MWIcon name={icon} size={26} stroke="var(--brand)" />
              <h3 className="disp" style={{ fontSize: 19, color: "var(--ink)", margin: "12px 0 0", lineHeight: 1.12 }}>{title}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section style={{ padding: "44px 18px 8px" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <Eyebrow center>How it works</Eyebrow>
          <h2 className="disp" style={{ fontSize: 28, color: "var(--brand)", margin: "10px 0 0", lineHeight: 1.04 }}>From application to first order</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {steps.map(([n, title, body]) => (
            <div key={n} style={{ display: "flex", gap: 16 }}>
              <div className="disp" style={{ fontSize: 36, color: "var(--gold-line)", fontWeight: 600, lineHeight: 1, flex: "0 0 auto", width: 46 }}>{n}</div>
              <div>
                <h3 className="disp" style={{ fontSize: 21, color: "var(--ink)", margin: "0 0 6px", lineHeight: 1.1 }}>{title}</h3>
                <p className="prose" style={{ fontSize: 14.5, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* volume tiers */}
      <section style={{ background: "#1A1A1A", color: "#FDFAF5", padding: "44px 18px", marginTop: 32, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(110% 70% at 50% 0%, rgba(15,110,86,.22), transparent 58%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <Eyebrow center light>Volume tiers</Eyebrow>
            <h2 className="disp" style={{ fontSize: 28, margin: "10px 0 0", lineHeight: 1.04, fontWeight: 600 }}>Pricing that scales with you</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {tiers.map((t) => (
              <div key={t.name} style={{ position: "relative", borderRadius: 16, padding: "24px 22px",
                background: t.featured ? "linear-gradient(160deg,#0F6E56,#0B5343)" : "rgba(253,250,245,.04)",
                border: t.featured ? "1px solid rgba(230,184,96,.5)" : "1px solid rgba(253,250,245,.14)" }}>
                {t.featured && <span style={{ position: "absolute", top: 16, right: 16, fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#1A1A1A", background: "#E6B860", borderRadius: 999, padding: "4px 10px" }}>Most popular</span>}
                <h3 className="disp" style={{ fontSize: 23, margin: 0, fontWeight: 600, lineHeight: 1.14, paddingRight: t.featured ? 90 : 0 }}>{t.name}</h3>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "rgba(253,250,245,.66)", margin: "8px 0 16px", lineHeight: 1.45 }}>{t.tag}</p>
                <div className="disp" style={{ fontSize: t.moq.length > 4 ? 30 : 40, fontWeight: 600, color: "#E6B860", lineHeight: 1 }}>{t.moq}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "rgba(253,250,245,.58)", margin: "8px 0 16px" }}>minimum order · <span style={{ color: t.featured ? "#9FE3C4" : "var(--brand-2)", fontWeight: 700 }}>{t.save}</span></div>
                <div style={{ height: 1, background: "rgba(253,250,245,.14)", marginBottom: 16 }} />
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {t.features.map((feat) => <li key={feat} style={{ display: "flex", gap: 10, fontFamily: "var(--font-ui)", fontSize: 13, color: "rgba(253,250,245,.86)", lineHeight: 1.4 }}><MWIcon name="check" size={15} stroke="#E6B860" w={2.2} />{feat}</li>)}
                </ul>
                <button className={t.featured ? (local ? "btn btn-local" : "btn btn-intl") : "btn"} style={t.featured ? { width: "100%", marginTop: 20, padding: "13px" } : { width: "100%", marginTop: 20, padding: "13px", background: "transparent", color: "#FDFAF5", border: "1px solid rgba(253,250,245,.4)" }}>
                  {t.moq === "Custom" ? "Talk to us" : "Apply for this tier"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* application form */}
      <section style={{ padding: "44px 18px 8px" }}>
        <Eyebrow>Apply</Eyebrow>
        <h2 className="disp" style={{ fontSize: 30, color: "var(--brand)", margin: "10px 0 14px", lineHeight: 1.03 }}>Open a trade account</h2>
        <p className="prose" style={{ fontSize: 15, color: "var(--ink)", margin: "0 0 22px" }}>Tell us a little about your business. Our trade team reviews every application by hand and replies within two business days.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {[["clock", "Reviewed within 48 hours"], ["box", "Free sample box for qualified accounts"], ["mail", "A real person, not a portal"]].map(([ic, t]) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, flex: "0 0 auto", display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--line)" }}><MWIcon name={ic} size={18} stroke="var(--brand)" /></div>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>{t}</span>
            </div>
          ))}
        </div>
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow-md)", padding: "22px 18px" }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "16px 4px" }}>
              <div style={{ width: 60, height: 60, borderRadius: 999, background: accent, display: "grid", placeItems: "center", margin: "0 auto 18px" }}><MWIcon name="check" size={30} stroke="#fff" w={2.4} /></div>
              <h3 className="disp" style={{ fontSize: 30, color: "var(--brand)", margin: "0 0 10px", lineHeight: 1.05 }}>Application received</h3>
              <p className="prose" style={{ fontSize: 15, color: "var(--ink)", margin: "0 auto 18px", maxWidth: 320 }}>Thank you, {f.contact ? f.contact.split(" ")[0] : "there"}. Your reference is <b style={{ color: accent }}>{ref}</b>. We'll be in touch within two business days.</p>
              <button className="btn btn-ghost" style={{ width: "auto", padding: "11px 22px", margin: "0 auto" }} onClick={() => { setDone(false); setF({ company: "", contact: "", email: "", country: "", type: "", volume: "", message: "", consent: false }); }}>Submit another</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{lbl("Company name", true)}<input required value={f.company} onChange={(e) => set("company", e.target.value)} placeholder="e.g. Maison Épice" style={inputStyle} /></label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{lbl("Contact name", true)}<input required value={f.contact} onChange={(e) => set("contact", e.target.value)} placeholder="Your full name" style={inputStyle} /></label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{lbl("Work email", true)}<input required type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com" style={inputStyle} /></label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{lbl("Country", true)}<select required value={f.country} onChange={(e) => set("country", e.target.value)} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}><option value="" disabled>Select country</option>{countries.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{lbl("Business type", true)}<select required value={f.type} onChange={(e) => set("type", e.target.value)} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}><option value="" disabled>Select type</option>{types.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{lbl("Estimated monthly volume", true)}<select required value={f.volume} onChange={(e) => set("volume", e.target.value)} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}><option value="" disabled>Select a range</option>{volumeBands.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{lbl("What are you looking for?", false)}<textarea value={f.message} onChange={(e) => set("message", e.target.value)} rows={3} placeholder="Which spices, quantities, timelines…" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}></textarea></label>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" required checked={f.consent} onChange={(e) => set("consent", e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, accentColor: "var(--brand)" }} />
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>I'd like to receive wholesale pricing and harvest updates. We never share your details.</span>
                </label>
              </div>
              <button type="submit" className="btn" style={{ background: accent, color: "#fff", marginTop: 18, padding: "14px", fontSize: 15 }}>Submit application</button>
            </form>
          )}
        </div>
      </section>

      {/* faq */}
      <section style={{ background: "var(--surface)", padding: "44px 18px", marginTop: 32, borderTop: "1px solid var(--line)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Eyebrow center>Questions</Eyebrow>
          <h2 className="disp" style={{ fontSize: 28, color: "var(--brand)", margin: "10px 0 0", lineHeight: 1.04 }}>Wholesale, answered</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {faqs.map(([q, a], i) => <MWFAQItem key={q} q={q} a={a} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />)}
        </div>
      </section>

      <MPageFooter market={market} />
    </div>
  );
}

Object.assign(window, { MShippingBody, MSMarketSeg, MobileSupport, MobileWholesale });
