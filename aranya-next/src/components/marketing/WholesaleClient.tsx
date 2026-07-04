"use client";

import * as React from "react";
import type { Market } from "@/lib/types";
import { submitWholesale } from "@/lib/api/wholesale";
import { Reveal } from "../primitives/Reveal";
import { Eyebrow } from "../primitives/Motif";
import { ImageSlot } from "../primitives/ImageSlot";
import { useMarket } from "../MarketContext";

// Wholesale / Trade page (ported from wholesale.jsx). Storefront-styled.
// Application form captures what the admin Wholesale queue shows: company,
// contact, country, business type, monthly volume.

function WIcon({ name, size = 22, stroke = "var(--brand)", w = 1.6 }: { name: string; size?: number; stroke?: string; w?: number }) {
  const p: Record<string, React.ReactNode> = {
    utensils: (<><path d="M5 3v8a2 2 0 0 0 4 0V3M7 11v10" /><path d="M17 3c-1.7 0-3 2-3 5s1.3 4 3 4m0 0v9m0-9c1.7 0 3-1 3-4s-1.3-5-3-5z" /></>),
    store: (<><path d="M4 9l1.2-5h13.6L20 9M4 9h16M4 9v11h16V9M9 20v-6h6v6" /><path d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" /></>),
    coffee: (<><path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" /><path d="M17 9h2.5a2.5 2.5 0 0 1 0 5H17" /><path d="M7 2.5c-.6 1 .6 1.6 0 2.6M11 2.5c-.6 1 .6 1.6 0 2.6" /></>),
    basket: (<><path d="M5 9l3-5M19 9l-3-5" /><path d="M3 9h18l-1.5 9.5A2 2 0 0 1 17.5 20h-11a2 2 0 0 1-2-1.5L3 9z" /><path d="M9 13v3M15 13v3" /></>),
    factory: (<><path d="M3 21V9l6 4V9l6 4V5h6v16H3z" /><path d="M7 21v-4M12 21v-4M17 21v-4" /></>),
    certificate: (<><path d="M12 3l2.4 1.6 2.8-.4 1 2.7 2.3 1.7-.9 2.7.9 2.7-2.3 1.7-1 2.7-2.8-.4L12 21l-2.4-1.6-2.8.4-1-2.7L3.5 15.4l.9-2.7-.9-2.7 2.3-1.7 1-2.7 2.8.4L12 3z" /><path d="M9 12l2 2 4-4" /></>),
    truck: (<><path d="M2 6h12v10H2zM14 9h4l3 3v4h-7z" /><circle cx="6.5" cy="18" r="1.8" /><circle cx="17.5" cy="18" r="1.8" /></>),
    label: (<><path d="M20.6 13.4L13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6z" /><circle cx="7.5" cy="7.5" r="1.4" /></>),
    leaf: <path d="M11 21C5 18 4 9 20 4c1 9-3 16-12 14-2-4 1-9 7-11" />,
    check: <path d="M5 12l5 5L20 6" />,
    chevron: <path d="M6 9l6 6 6-6" />,
    clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
    box: (<><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7M12 11v10" /></>),
    mail: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>),
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>{p[name]}</svg>;
}

function WholesaleHero({ market, scrollToForm }: { market: Market; scrollToForm: () => void }) {
  const btn = market === "local" ? "btn btn-local" : "btn btn-intl";
  const stats: [string, string][] = [["5 kg", "Lowest MOQ per spice"], ["48 hrs", "Application review"], ["40+", "Countries shipped"], ["GI", "Certified single-origin"]];
  return (
    <header data-hero style={{ position: "relative", minHeight: "92vh", background: "#161412", color: "#FDFAF5", overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
      <ImageSlot id="wholesale-hero" shape="rect" fit="cover" placeholder="Drop a hero photo — sacks of spice / warehouse / hands with bulk cinnamon" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(150deg, rgba(15,110,86,.36), rgba(11,16,13,.62))", mixBlendMode: "multiply", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,8,6,.55) 0%, transparent 30%, transparent 44%, rgba(10,8,6,.86) 100%)", pointerEvents: "none" }} />
      <div className="home-section-pad" style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 40px 76px", width: "100%" }}>
        <Reveal><Eyebrow light>Wholesale &amp; Trade</Eyebrow></Reveal>
        <Reveal delay={80}>
          <h1 className="disp disp-hero-h2" style={{ fontSize: "clamp(46px,6.6vw,98px)", lineHeight: 0.98, margin: "20px 0 0", fontWeight: 600, letterSpacing: ".005em", maxWidth: 1040 }}>
            Ceylon spice,<br />by the <span style={{ fontStyle: "italic", color: "#E6B860" }}>kilo.</span>
          </h1>
        </Reveal>
        <Reveal delay={150}>
          <p className="prose" style={{ fontSize: "clamp(17px,1.5vw,21px)", color: "rgba(253,250,245,.85)", margin: "26px 0 0", maxWidth: 580 }}>
            The same hand-rolled cinnamon and hill-country pepper we sell by the pouch — now supplied to the kitchens, roasters and shelves that taste the difference. Single-origin, harvest-fresh, traceable to the estate.
          </p>
        </Reveal>
        <Reveal delay={210}>
          <div style={{ display: "flex", gap: 14, marginTop: 34, flexWrap: "wrap" }}>
            <button className={btn} style={{ width: "auto", padding: "15px 28px" }} onClick={scrollToForm}>Apply for a trade account</button>
            <button className="btn" style={{ width: "auto", padding: "15px 26px", background: "rgba(253,250,245,.12)", color: "#FDFAF5", border: "1px solid rgba(253,250,245,.34)", backdropFilter: "blur(4px)" }} onClick={scrollToForm}>Request the price list</button>
          </div>
        </Reveal>
        <Reveal delay={270}>
          <div style={{ display: "flex", gap: 0, marginTop: 52, flexWrap: "wrap", borderTop: "1px solid rgba(253,250,245,.18)", paddingTop: 26, maxWidth: 820 }}>
            {stats.map((s, i) => (
              <div key={s[0]} style={{ flex: "1 1 150px", paddingLeft: i ? 26 : 0, borderLeft: i ? "1px solid rgba(253,250,245,.16)" : "none", marginLeft: i ? 26 : 0 }}>
                <div className="disp" style={{ fontSize: 36, color: "#E6B860", fontWeight: 600, lineHeight: 1 }}>{s[0]}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "rgba(253,250,245,.72)", marginTop: 7, letterSpacing: ".01em" }}>{s[1]}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </header>
  );
}

function WholesaleWhy() {
  const props: [string, string, string][] = [
    ["certificate", "Single-origin & GI-certified", "Every lot traces to a named Sri Lankan estate, with Geographical Indication paperwork and organic certificates on file for your compliance team."],
    ["leaf", "Harvest-fresh, even in bulk", "We mill and seal to order rather than from a warehouse — so a 25 kg sack arrives as aromatic as our retail pouches, not flattened by months in storage."],
    ["label", "Flexible MOQs & private label", "Start at just 5 kg per spice. Scale into custom blends, your own labelling, and bespoke pack sizes as the partnership grows."],
    ["truck", "Tracked, insured logistics", "Consolidated freight to 40+ countries, fully tracked and insured, with PayHere settlement locally and Stripe invoicing internationally."],
  ];
  return (
    <section style={{ background: "var(--bg)", padding: "104px 0 92px" }}>
      <div className="home-section-pad" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ maxWidth: 620, marginBottom: 52 }}>
          <Reveal><Eyebrow>Why trade with us</Eyebrow></Reveal>
          <Reveal delay={60}>
            <h2 className="disp" style={{ fontSize: "clamp(32px,3.8vw,50px)", color: "var(--brand)", margin: "14px 0 0", lineHeight: 1.04 }}>
              Wholesale without the compromise
            </h2>
          </Reveal>
        </div>
        <div className="wh-why-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 28 }}>
          {props.map(([icon, title, body], i) => (
            <Reveal key={title} delay={(i % 2) * 80}>
              <div style={{ display: "flex", gap: 18 }}>
                <div style={{ width: 52, height: 52, borderRadius: 12, flex: "0 0 auto", display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--line)" }}>
                  <WIcon name={icon} size={24} stroke="var(--brand)" />
                </div>
                <div>
                  <h3 className="disp" style={{ fontSize: 24, color: "var(--ink)", margin: "2px 0 8px", lineHeight: 1.1 }}>{title}</h3>
                  <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: 0, lineHeight: 1.66 }}>{body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function WholesaleWho() {
  const kinds: [string, string, string][] = [
    ["utensils", "Restaurants & hotels", "Black-curry kitchens, fine-dining pastry, hotel groups"],
    ["store", "Specialty retailers", "Grocers, delis and gift shops stocking premium pantry"],
    ["coffee", "Cafés & roasters", "Chai, golden-milk and spiced-bake programmes"],
    ["basket", "Online grocers", "D2C pantries and subscription boxes shipping worldwide"],
    ["factory", "Food manufacturers", "Blenders, bakers and CPG brands needing reliable origin"],
  ];
  return (
    <section style={{ background: "var(--surface)", padding: "92px 0", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
      <div className="home-section-pad" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 44 }}>
          <div>
            <Reveal><Eyebrow>Who we supply</Eyebrow></Reveal>
            <Reveal delay={60}><h2 className="disp" style={{ fontSize: "clamp(32px,3.8vw,50px)", color: "var(--brand)", margin: "14px 0 0", lineHeight: 1.04 }}>Built for serious kitchens &amp; shelves</h2></Reveal>
          </div>
          <Reveal delay={100}><p style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--muted)", maxWidth: 340, lineHeight: 1.6, paddingBottom: 6 }}>If you sell, cook with, or make food from spice, there&rsquo;s a trade tier for you.</p></Reveal>
        </div>
        <div className="wh-who-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 18 }}>
          {kinds.map(([icon, title, body], i) => (
            <Reveal key={title} delay={i * 60}>
              <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "26px 20px", height: "100%", boxShadow: "var(--shadow-sm)" }}>
                <WIcon name={icon} size={28} stroke="var(--brand)" />
                <h3 className="disp" style={{ fontSize: 21, color: "var(--ink)", margin: "16px 0 8px", lineHeight: 1.12 }}>{title}</h3>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", margin: 0, lineHeight: 1.55 }}>{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function WholesaleSteps({ scrollToForm, market }: { scrollToForm: () => void; market: Market }) {
  const steps: [string, string, string][] = [
    ["01", "Apply", "Tell us about your business and what you're looking for. Two minutes — the form's just below."],
    ["02", "We review", "Our trade team reviews and replies within two business days with pricing and next steps."],
    ["03", "Taste a sample box", "We send a curated sample box of the lots relevant to you, so you buy on aroma, not a spec sheet."],
    ["04", "Onboard & order", "Approved accounts get a price list, payment terms, and a dedicated contact. Reorder in a tap."],
  ];
  const btn = market === "local" ? "btn btn-local" : "btn btn-intl";
  return (
    <section style={{ background: "var(--bg)", padding: "100px 0" }}>
      <div className="home-section-pad" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Reveal><Eyebrow center>How it works</Eyebrow></Reveal>
          <Reveal delay={60}><h2 className="disp" style={{ fontSize: "clamp(32px,3.8vw,50px)", color: "var(--brand)", margin: "14px 0 0", lineHeight: 1.04 }}>From application to first order</h2></Reveal>
        </div>
        <div className="wh-steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22, position: "relative" }}>
          {steps.map(([n, title, body], i) => (
            <Reveal key={n} delay={i * 80}>
              <div style={{ position: "relative" }}>
                <div className="disp" style={{ fontSize: 46, color: "var(--gold-line)", fontWeight: 600, lineHeight: 1 }}>{n}</div>
                <div style={{ height: 1, background: "var(--line)", margin: "16px 0 18px", position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, top: -3, width: 7, height: 7, borderRadius: 9, background: "var(--accent)" }} />
                </div>
                <h3 className="disp" style={{ fontSize: 23, color: "var(--ink)", margin: "0 0 8px", lineHeight: 1.1 }}>{title}</h3>
                <p className="prose" style={{ fontSize: 15, color: "var(--muted)", margin: 0, lineHeight: 1.62 }}>{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={120}>
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <button className={btn} style={{ width: "auto", padding: "14px 30px" }} onClick={scrollToForm}>Start your application</button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function WholesaleTiers({ market, scrollToForm }: { market: Market; scrollToForm: () => void }) {
  const local = market === "local";
  const tiers = [
    { name: "Trade Starter", tag: "Cafés, small kitchens & boutiques", moq: "5 kg", priceNote: "List trade pricing", save: "Up to 20% off retail", features: ["From 5 kg per spice", "Standard retail packaging or bulk", "Card & PayHere / Stripe checkout", "Reorder online anytime"], featured: false },
    { name: "Trade", tag: "Restaurants, retailers & roasters", moq: "25 kg", priceNote: "Volume trade pricing", save: "Up to 30% off retail", features: ["From 25 kg per spice", "Net-30 terms on approval", "Priority harvest allocation", "Dedicated trade contact", "Quarterly sample boxes"], featured: true },
    { name: "Distributor & Private Label", tag: "Manufacturers & national accounts", moq: "Custom", priceNote: "Contract pricing", save: "Custom", features: ["Custom volumes & blends", "Your own labelling & pack sizes", "Bespoke logistics & lead times", "Account manager & forecasting"], featured: false },
  ];
  const btn = local ? "btn btn-local" : "btn btn-intl";
  return (
    <section style={{ background: "#1A1A1A", color: "#FDFAF5", padding: "104px 0", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(110% 70% at 50% 0%, rgba(15,110,86,.22), transparent 58%)", pointerEvents: "none" }} />
      <div className="home-section-pad" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <Reveal><Eyebrow center light>Volume tiers</Eyebrow></Reveal>
          <Reveal delay={60}><h2 className="disp" style={{ fontSize: "clamp(32px,3.8vw,50px)", margin: "14px 0 0", lineHeight: 1.04, fontWeight: 600 }}>Pricing that scales with you</h2></Reveal>
          <Reveal delay={100}><p style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, color: "rgba(253,250,245,.66)", margin: "14px auto 0", maxWidth: 520 }}>Indicative tiers — final pricing is set per spice and volume after your application. Currency follows your selected market ({local ? "LKR" : "USD"}).</p></Reveal>
        </div>
        <div className="wh-tier-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22, marginTop: 48, alignItems: "stretch" }}>
          {tiers.map((t, i) => (
            <Reveal key={t.name} delay={i * 80} style={{ display: "flex" }}>
              <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", borderRadius: 16, padding: "28px 26px 30px", background: t.featured ? "linear-gradient(160deg,#0F6E56,#0B5343)" : "rgba(253,250,245,.04)", border: t.featured ? "1px solid rgba(230,184,96,.5)" : "1px solid rgba(253,250,245,.14)", boxShadow: t.featured ? "0 28px 60px rgba(0,0,0,.4)" : "none" }}>
                {t.featured && <span style={{ position: "absolute", top: 18, right: 18, fontFamily: "var(--font-ui)", fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#1A1A1A", background: "#E6B860", borderRadius: 999, padding: "4px 11px" }}>Most popular</span>}
                <div style={{ minHeight: 96 }}>
                  <h3 className="disp" style={{ fontSize: 25, margin: 0, fontWeight: 600, lineHeight: 1.14, paddingRight: t.featured ? 100 : 0 }}>{t.name}</h3>
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: t.featured ? "rgba(253,250,245,.78)" : "rgba(253,250,245,.6)", margin: "10px 0 0", lineHeight: 1.45 }}>{t.tag}</p>
                </div>
                <div style={{ margin: "18px 0 20px" }}>
                  <div className="disp" style={{ fontSize: t.moq.length > 4 ? 34 : 44, fontWeight: 600, color: "#E6B860", lineHeight: 1, whiteSpace: "nowrap" }}>{t.moq}</div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "rgba(253,250,245,.58)", marginTop: 9 }}>
                    minimum order · <span style={{ color: t.featured ? "#9FE3C4" : "var(--brand-2)", fontWeight: 700 }}>{t.save}</span>
                  </div>
                </div>
                <div style={{ height: 1, background: "rgba(253,250,245,.14)", marginBottom: 18 }} />
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 11, flex: 1 }}>
                  {t.features.map((f) => (
                    <li key={f} style={{ display: "flex", gap: 10, fontFamily: "var(--font-ui)", fontSize: 13.5, color: "rgba(253,250,245,.86)", lineHeight: 1.4 }}>
                      <WIcon name="check" size={16} stroke="#E6B860" w={2.2} />{f}
                    </li>
                  ))}
                </ul>
                <button onClick={scrollToForm} className={t.featured ? btn : "btn"} style={t.featured ? { width: "100%", marginTop: 24, padding: "13px" } : { width: "100%", marginTop: 24, padding: "13px", background: "transparent", color: "#FDFAF5", border: "1px solid rgba(253,250,245,.4)" }}>
                  {t.priceNote === "Contract pricing" ? "Talk to us" : "Apply for this tier"}
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

interface WForm { company: string; contact: string; email: string; phone: string; country: string; type: string; volume: string; website: string; message: string; consent: boolean; }
const EMPTY_WFORM: WForm = { company: "", contact: "", email: "", phone: "", country: "", type: "", volume: "", website: "", message: "", consent: false };

function WholesaleForm({ market, formRef }: { market: Market; formRef: React.RefObject<HTMLElement> }) {
  const [done, setDone] = React.useState(false);
  const [ref, setRef] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [f, setF] = React.useState<WForm>(EMPTY_WFORM);
  const set = (k: keyof WForm, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const local = market === "local";
  const btn = local ? "btn btn-local" : "btn btn-intl";
  const volumeBands = local ? ["Under Rs 300,000", "Rs 300k – 1.5M", "Rs 1.5M – 4.5M", "Rs 4.5M+"] : ["Under $1,000", "$1,000 – $5,000", "$5,000 – $15,000", "$15,000+"];
  const types = ["Restaurant / hotel", "Specialty retailer", "Café / roaster", "Online grocer", "Food manufacturer", "Other"];
  const countries = ["Sri Lanka", "United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Netherlands", "Singapore", "United Arab Emirates", "Japan", "Other"];

  const [submitting, setSubmitting] = React.useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitWholesale({ company: f.company, contact: f.contact, email: f.email, phone: f.phone || undefined, country: f.country, type: f.type, volume: f.volume || undefined, website: f.website || undefined, message: f.message || undefined, consent: f.consent });
      // Only confirm on a real success — don't fabricate a reference for a lead
      // the backend never received (BUG-10).
      setRef(res.ref);
      setDone(true);
      if (formRef.current) formRef.current.scrollIntoView({ block: "start" });
    } catch (err) {
      setError((err as Error)?.message || "Sorry — your application couldn't be submitted. Please try again, or email trade@aranyaceylon.com.");
    } finally {
      setSubmitting(false);
    }
  };

  const field = (label: string, key: keyof WForm, type = "text", ph = "", req = true) => (
    <label className="wh-field" style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, color: "var(--ink)", letterSpacing: ".01em" }}>{label}{req && <span style={{ color: "var(--accent)" }}> *</span>}</span>
      <input required={req} type={type} placeholder={ph} value={f[key] as string} onChange={(e) => set(key, e.target.value)} className="wh-input" />
    </label>
  );
  const select = (label: string, key: keyof WForm, opts: string[], ph: string) => (
    <label className="wh-field" style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, color: "var(--ink)", letterSpacing: ".01em" }}>{label}<span style={{ color: "var(--accent)" }}> *</span></span>
      <select required value={f[key] as string} onChange={(e) => set(key, e.target.value)} className="wh-input" style={{ appearance: "none", cursor: "pointer" }}>
        <option value="" disabled>{ph}</option>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );

  return (
    <section ref={formRef as React.RefObject<HTMLDivElement>} id="apply" style={{ background: "var(--bg)", padding: "104px 0", scrollMarginTop: 90 }}>
      <div className="home-section-pad wh-form-wrap" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "0.82fr 1.18fr", gap: 64, alignItems: "start" }}>
        <div style={{ position: "sticky", top: 100 }}>
          <Reveal><Eyebrow>Apply</Eyebrow></Reveal>
          <Reveal delay={60}>
            <h2 className="disp" style={{ fontSize: "clamp(34px,4vw,54px)", color: "var(--brand)", margin: "14px 0 20px", lineHeight: 1.03 }}>
              Open a trade account
            </h2>
          </Reveal>
          <Reveal delay={110}>
            <p className="prose" style={{ fontSize: 17, color: "var(--ink)", margin: "0 0 28px", maxWidth: 380 }}>
              Tell us a little about your business. Our trade team reviews every application by hand and replies within two business days — usually with a sample box on the way.
            </p>
          </Reveal>
          <Reveal delay={150}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {([["clock", "Reviewed within 48 hours"], ["box", "Free sample box for qualified accounts"], ["mail", "A real person, not a portal"]] as [string, string][]).map(([ic, t]) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, flex: "0 0 auto", display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--line)" }}><WIcon name={ic} size={19} stroke="var(--brand)" /></div>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--ink)", fontWeight: 500 }}>{t}</span>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={190}>
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
                Prefer to talk? Email <a href="mailto:trade@aranyaceylon.com" style={{ color: "var(--brand)", fontWeight: 700 }}>trade@aranyaceylon.com</a> or call <span style={{ color: "var(--ink)", fontWeight: 600 }}>+94 81 249 0000</span>.
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={80}>
          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow-md)", padding: "clamp(24px,3vw,40px)" }}>
            {done ? (
              <div style={{ textAlign: "center", padding: "30px 10px" }}>
                <div style={{ width: 64, height: 64, borderRadius: 999, background: local ? "var(--brand)" : "var(--accent)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
                  <WIcon name="check" size={32} stroke="#fff" w={2.4} />
                </div>
                <h3 className="disp" style={{ fontSize: 34, color: "var(--brand)", margin: "0 0 12px", lineHeight: 1.05 }}>Application received</h3>
                <p className="prose" style={{ fontSize: 16.5, color: "var(--ink)", margin: "0 auto 8px", maxWidth: 420 }}>
                  Thank you, {f.contact ? f.contact.split(" ")[0] : "there"}. Your reference is <b style={{ color: "var(--accent)" }}>{ref}</b>. Our trade team will review it and be in touch within two business days.
                </p>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--muted)", margin: "14px 0 26px" }}>We&rsquo;ve emailed a copy to {f.email || "your inbox"}.</p>
                <button className="btn btn-ghost" style={{ width: "auto", padding: "12px 24px", margin: "0 auto" }} onClick={() => { setDone(false); setF(EMPTY_WFORM); }}>Submit another</button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="wh-grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  {field("Company name", "company", "text", "e.g. Maison Épice")}
                  {field("Contact name", "contact", "text", "Your full name")}
                  {field("Work email", "email", "email", "you@company.com")}
                  {field("Phone", "phone", "tel", "+94 …", false)}
                  {select("Country", "country", countries, "Select country")}
                  {select("Business type", "type", types, "Select type")}
                  {select("Estimated monthly volume", "volume", volumeBands, "Select a range")}
                  {field("Website", "website", "text", "company.com", false)}
                </div>
                <label className="wh-field" style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 18 }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>What are you looking for?</span>
                  <textarea value={f.message} onChange={(e) => set("message", e.target.value)} className="wh-input" rows={4} placeholder="Which spices, rough quantities, timelines, private-label interest…" style={{ resize: "vertical", lineHeight: 1.6 }}></textarea>
                </label>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 18, cursor: "pointer" }}>
                  <input type="checkbox" required checked={f.consent} onChange={(e) => set("consent", e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, accentColor: "var(--brand)" }} />
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>I&rsquo;d like to receive wholesale pricing and harvest updates from Aranya Ceylon. We never share your details.</span>
                </label>
                {error && <div role="alert" style={{ marginTop: 18, padding: "11px 14px", borderRadius: 9, background: "rgba(192,83,31,.1)", border: "1px solid rgba(192,83,31,.35)", color: "#C0531F", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600 }}>{error}</div>}
                <button type="submit" className={btn} style={{ marginTop: 24, padding: "15px", opacity: submitting ? 0.6 : 1 }} disabled={submitting}>{submitting ? "Submitting…" : "Submit application"}</button>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", textAlign: "center", marginTop: 14 }}>Applications are reviewed by our trade team — this won&rsquo;t create a public account.</p>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function WholesaleFAQ() {
  const faqs: [string, string][] = [
    ["What's the minimum order?", "Trade accounts start at just 5 kg per spice. There's no minimum number of lines — mix and match across our range to hit your volume."],
    ["How fresh is the spice at bulk volumes?", "We mill and seal to order rather than shipping from long-term storage. Whole spices keep best, so for large orders we recommend whole quills and pods, ground to your schedule."],
    ["Do you offer private label or custom blends?", "Yes — from the Trade tier upward we offer your own labelling, custom pack sizes and bespoke blends (including Sri Lankan curry bases roasted to your spec)."],
    ["What payment terms and methods are available?", "Local (Sri Lanka) accounts settle in LKR via PayHere; international accounts are invoiced in USD via Stripe. Net-30 terms are available on approval for Trade and above."],
    ["How does shipping work?", "We consolidate freight to 40+ countries, fully tracked and insured. Lead times and incoterms are confirmed per order; island delivery within Sri Lanka is typically 2–4 days."],
    ["Can I get samples before committing?", "Qualified applicants receive a complimentary sample box of the lots relevant to their business, so you can taste before you order at volume."],
  ];
  const [open, setOpen] = React.useState(0);
  return (
    <section style={{ background: "var(--surface)", padding: "100px 0", borderTop: "1px solid var(--line)" }}>
      <div className="home-section-pad" style={{ maxWidth: 880, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <Reveal><Eyebrow center>Questions</Eyebrow></Reveal>
          <Reveal delay={60}><h2 className="disp" style={{ fontSize: "clamp(32px,3.8vw,50px)", color: "var(--brand)", margin: "14px 0 0", lineHeight: 1.04 }}>Wholesale, answered</h2></Reveal>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {faqs.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <Reveal key={q} delay={Math.min(i, 4) * 50}>
                <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
                  <button onClick={() => setOpen(isOpen ? -1 : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "20px 24px", background: "none", border: 0, cursor: "pointer", textAlign: "left" }}>
                    <span className="disp" style={{ fontSize: 21, color: "var(--ink)", lineHeight: 1.15 }}>{q}</span>
                    <span style={{ flex: "0 0 auto", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .25s" }}><WIcon name="chevron" size={20} stroke="var(--brand)" /></span>
                  </button>
                  <div style={{ maxHeight: isOpen ? 240 : 0, overflow: "hidden", transition: "max-height .3s ease" }}>
                    <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: 0, padding: "0 24px 22px", lineHeight: 1.7 }}>{a}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function WholesaleClient() {
  const { market } = useMarket();
  const formRef = React.useRef<HTMLElement>(null);
  const scrollToForm = () => { if (formRef.current) formRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); };
  return (
    <div data-screen-label="Wholesale">
      <WholesaleHero market={market} scrollToForm={scrollToForm} />
      <WholesaleWhy />
      <WholesaleWho />
      <WholesaleSteps market={market} scrollToForm={scrollToForm} />
      <WholesaleTiers market={market} scrollToForm={scrollToForm} />
      <WholesaleForm market={market} formRef={formRef} />
      <WholesaleFAQ />
    </div>
  );
}
