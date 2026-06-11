/* Aranya Ceylon — SHIPPING & RETURNS page sections.
   Market-driven rate tables (domestic LKR / international USD), tracking explainer,
   customs note, returns & refunds policy. Rate constants mirror cart-store.js config.
   Depends on support-common.jsx (SIcon, SupportCTA), home-common.jsx (Reveal, Eyebrow). Exports ShipBody. */
const { useState: shState } = React;

/* ---- one region rate card ---- */
function RateCard({ region, you, currencyNote, freeLine, rows, market }) {
  const local = market === "local";
  const highlight = you;
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", background: "#fff",
      border: highlight ? "1.5px solid var(--brand)" : "1px solid var(--line)", borderRadius: 16,
      boxShadow: highlight ? "var(--shadow-md)" : "var(--shadow-sm)", overflow: "hidden" }}>
      {highlight && <span style={{ position: "absolute", top: 16, right: 16, fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#fff", background: "var(--brand)", borderRadius: 999, padding: "4px 11px" }}>Your region</span>}
      <div style={{ padding: "26px 26px 18px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span style={{ width: 42, height: 42, borderRadius: 11, display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--line)", flex: "0 0 auto" }}><SIcon name={region.icon} size={21} stroke="var(--brand)" /></span>
          <div>
            <h3 className="disp" style={{ fontSize: 25, color: "var(--ink)", margin: 0, lineHeight: 1.1 }}>{region.name}</h3>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{currencyNote}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "6px 26px" }}>
        {rows.map((r, i) => (
          <div key={r[0]} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "baseline", padding: "16px 0", borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none" }}>
            <div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{r[0]}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>{r[1]}</div>
            </div>
            <div className="disp" style={{ fontSize: 22, color: "var(--brand)", fontWeight: 600, whiteSpace: "nowrap" }}>{r[2]}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 9, padding: "16px 26px", background: local && highlight ? "rgba(15,110,86,.07)" : "var(--surface)", borderTop: "1px solid var(--line)" }}>
        <SIcon name="spark" size={17} stroke="var(--accent)" />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{freeLine}</span>
      </div>
    </div>
  );
}

/* ---- rates section ---- */
function ShipRates({ market }) {
  const local = market === "local";
  const domestic = {
    region: { name: "Within Sri Lanka", icon: "pin" },
    currencyNote: "Dispatched from Kandy · priced in LKR",
    you: local,
    freeLine: "Free standard delivery over Rs 5,000",
    rows: [
      ["Standard · islandwide", "2–4 working days", "Rs 650"],
      ["Express · Colombo & suburbs", "1–2 working days", "Rs 950"],
      ["Store collection · Kandy", "By appointment", "Free"],
    ],
  };
  const intl = {
    region: { name: "International", icon: "plane" },
    currencyNote: "Tracked & insured · priced in USD",
    you: !local,
    freeLine: "Free standard shipping over $60",
    rows: [
      ["Standard · tracked", "7–14 working days", "$8.50"],
      ["Express · courier", "3–6 working days", "$24.00"],
      ["Remote / outlying zones", "Quoted at checkout", "Varies"],
    ],
  };
  return (
    <section style={{ background: "var(--bg)", padding: "76px 0 90px" }}>
      <div className="home-section-pad" style={{ maxWidth: 1080, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 46 }}>
          <Reveal><Eyebrow center>Shipping rates</Eyebrow></Reveal>
          <Reveal delay={60}><h2 className="disp" style={{ fontSize: "clamp(30px,3.6vw,48px)", color: "var(--brand)", margin: "14px 0 0", lineHeight: 1.05 }}>Rates &amp; delivery times</h2></Reveal>
          <Reveal delay={100}><p style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--muted)", margin: "14px auto 0", maxWidth: 520, lineHeight: 1.6 }}>
            Your region is highlighted to match the selected market ({local ? "Sri Lanka · LKR" : "International · USD"}). Switch markets anytime from the toggle.
          </p></Reveal>
        </div>
        <div className="ship-rates" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, alignItems: "stretch" }}>
          <Reveal style={{ display: "flex" }}><div style={{ flex: 1, display: "flex" }}><RateCard {...domestic} market={market} /></div></Reveal>
          <Reveal delay={80} style={{ display: "flex" }}><div style={{ flex: 1, display: "flex" }}><RateCard {...intl} market={market} /></div></Reveal>
        </div>
        <Reveal delay={120}>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", textAlign: "center", margin: "26px auto 0", maxWidth: 640, lineHeight: 1.6 }}>
            Orders are milled and sealed to order, then dispatched within 1–2 working days. Delivery windows begin at dispatch and exclude public holidays.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---- tracking explainer ---- */
function ShipTracking() {
  const steps = [
    ["receipt", "Order placed", "You receive an instant confirmation email with your order number."],
    ["leaf", "Milled & packed", "We mill, weigh and seal your spices to order — usually within a few hours."],
    ["truck", "Dispatched", "Your parcel ships and a tracking link lands in your inbox the same day."],
    ["pin", "Out for delivery", "Follow the tracking link right to your door — or our Kandy counter for collection."],
  ];
  return (
    <section style={{ background: "var(--surface)", padding: "92px 0", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
      <div className="home-section-pad" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 44 }}>
          <div>
            <Reveal><Eyebrow>Tracking</Eyebrow></Reveal>
            <Reveal delay={60}><h2 className="disp" style={{ fontSize: "clamp(28px,3.4vw,44px)", color: "var(--brand)", margin: "12px 0 0", lineHeight: 1.05 }}>From our mill to your door</h2></Reveal>
          </div>
          <Reveal delay={100}><a href="Account.html" className="btn btn-ghost" style={{ width: "auto", padding: "12px 22px", display: "inline-flex", alignItems: "center", gap: 8 }}><SIcon name="truck" size={17} stroke="var(--brand)" />Track my order</a></Reveal>
        </div>
        <div className="ship-track" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {steps.map(([ic, t, b], i) => (
            <Reveal key={t} delay={i * 70}>
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <span style={{ width: 44, height: 44, borderRadius: 11, display: "grid", placeItems: "center", background: "#fff", border: "1px solid var(--line)", flex: "0 0 auto" }}><SIcon name={ic} size={21} stroke="var(--brand)" /></span>
                  <span className="disp" style={{ fontSize: 30, color: "var(--gold-line)", fontWeight: 600, lineHeight: 1 }}>{"0" + (i + 1)}</span>
                </div>
                <h3 className="disp" style={{ fontSize: 21, color: "var(--ink)", margin: "0 0 7px", lineHeight: 1.1 }}>{t}</h3>
                <p className="prose" style={{ fontSize: 14.5, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>{b}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={120}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginTop: 40, padding: "20px 22px", background: "#fff", border: "1px solid var(--line)", borderRadius: 13, maxWidth: 760 }}>
            <span style={{ flex: "0 0 auto", marginTop: 1 }}><SIcon name="globe" size={22} stroke="var(--accent)" /></span>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--muted)", margin: 0, lineHeight: 1.65 }}>
              <b style={{ color: "var(--ink)" }}>International duties &amp; taxes.</b> Customs charges are set by the destination country and are the recipient's responsibility — they're not included in our prices or shipping. Most personal-volume orders clear without issue.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---- returns & refunds ---- */
function ReturnsPolicy({ market }) {
  const cards = [
    ["refresh", "30-day returns", "Unopened, sealed items can be returned within 30 days of delivery for a refund — just get in touch first to start it off."],
    ["shield", "Damaged or wrong item", "Arrived damaged, leaking, or not what you ordered? Send a photo within 7 days and we'll replace or refund it free — no return needed."],
    ["receipt", "Refund timing", "Approved refunds go back to your original payment method within 2 business days, and usually appear within 5–10 days."],
  ];
  const steps = [
    ["Reach out", "Email support@aranyaceylon.com or WhatsApp us with your order number and what's wrong."],
    ["We confirm", "We reply within a business day with return instructions, or arrange a free replacement straight away."],
    ["Resolved", "Once we receive or verify the item, your refund or replacement is on its way."],
  ];
  const local = market === "local";
  return (
    <section style={{ background: "var(--bg)", padding: "92px 0 100px" }}>
      <div className="home-section-pad" style={{ maxWidth: 1080, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 46 }}>
          <Reveal><Eyebrow center>Returns &amp; refunds</Eyebrow></Reveal>
          <Reveal delay={60}><h2 className="disp" style={{ fontSize: "clamp(30px,3.6vw,48px)", color: "var(--brand)", margin: "14px 0 0", lineHeight: 1.05 }}>Fair, simple, human</h2></Reveal>
          <Reveal delay={100}><p style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--muted)", margin: "14px auto 0", maxWidth: 540, lineHeight: 1.6 }}>
            Spice is a fresh, consumable product, so opened items can't be resold — but if the quality ever falls short, we'll always make it right.
          </p></Reveal>
        </div>
        <div className="ship-returns" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 48 }}>
          {cards.map(([ic, t, b], i) => (
            <Reveal key={t} delay={i * 70}>
              <div style={{ height: "100%", background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: "26px 24px", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ width: 46, height: 46, borderRadius: 11, display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--line)", marginBottom: 16 }}><SIcon name={ic} size={22} stroke="var(--brand)" /></div>
                <h3 className="disp" style={{ fontSize: 22, color: "var(--ink)", margin: "0 0 8px", lineHeight: 1.12 }}>{t}</h3>
                <p className="prose" style={{ fontSize: 14.5, color: "var(--muted)", margin: 0, lineHeight: 1.64 }}>{b}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* how to start */}
        <Reveal delay={60}>
          <div style={{ background: "#1A1A1A", color: "#FDFAF5", borderRadius: 18, padding: "clamp(28px,3vw,44px)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 120% at 100% 0%, rgba(15,110,86,.24), transparent 55%)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <div className="eyebrow" style={{ color: "#E6B860", marginBottom: 8 }}>How to start a return</div>
              <h3 className="disp" style={{ fontSize: "clamp(24px,2.6vw,34px)", margin: "0 0 30px", fontWeight: 600, lineHeight: 1.08, maxWidth: 420 }}>Three steps, and a real person on the other end</h3>
              <div className="ship-steps" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 26 }}>
                {steps.map(([t, b], i) => (
                  <div key={t}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
                      <span style={{ width: 30, height: 30, borderRadius: 999, display: "grid", placeItems: "center", background: "#E6B860", color: "#1A1A1A", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 800, flex: "0 0 auto" }}>{i + 1}</span>
                      <span className="disp" style={{ fontSize: 21, color: "#FDFAF5", lineHeight: 1.1 }}>{t}</span>
                    </div>
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "rgba(253,250,245,.78)", margin: 0, lineHeight: 1.6, paddingLeft: 41 }}>{b}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 34, paddingTop: 24, borderTop: "1px solid rgba(253,250,245,.16)", display: "flex", gap: 13, flexWrap: "wrap" }}>
                <a href="Contact.html" className={local ? "btn btn-local" : "btn btn-intl"} style={{ width: "auto", padding: "13px 26px", display: "inline-block" }}>Start a return</a>
                <a href="https://wa.me/94812490000" style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, padding: "13px 24px", borderRadius: "var(--radius)", background: "rgba(253,250,245,.12)", color: "#FDFAF5", border: "1px solid rgba(253,250,245,.32)", display: "inline-flex", alignItems: "center", gap: 9 }}><SIcon name="whatsapp" size={17} stroke="#FDFAF5" />WhatsApp us</a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ShipBody({ market }) {
  return (
    <React.Fragment>
      <ShipRates market={market} />
      <ShipTracking />
      <ReturnsPolicy market={market} />
    </React.Fragment>
  );
}

Object.assign(window, { ShipBody, ShipRates, ShipTracking, ReturnsPolicy });
