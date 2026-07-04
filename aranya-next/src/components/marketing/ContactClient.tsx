"use client";

import * as React from "react";
import type { Market } from "@/lib/types";
import { submitContact } from "@/lib/api/contact";
import { Reveal } from "../primitives/Reveal";
import { Eyebrow } from "../primitives/Motif";
import { ImageSlot } from "../primitives/ImageSlot";
import { useMarket } from "../MarketContext";
import { SupportHeader, SIcon } from "./SupportCommon";

// Contact page (ported from contact.jsx). Dark support header → quick channel
// cards (overlapping) → form + directory → visit-us map.

const CONTACT = {
  phone: "+94 81 249 0000",
  wa: "https://wa.me/94812490000",
  waLabel: "+94 81 249 0000",
  hours: "Mon–Sat · 9:00–18:00 IST",
  address: ["No. 24, Spice Garden Road", "Kandy 20000, Sri Lanka"],
  emails: [
    ["headset", "Orders & general help", "support@aranyaceylon.com", "Tracking, changes, anything store-related"],
    ["truck", "Wholesale & trade", "trade@aranyaceylon.com", "Bulk pricing, samples, trade accounts"],
    ["spark", "Press & partnerships", "press@aranyaceylon.com", "Media, collaborations, stockist enquiries"],
  ] as [string, string, string, string][],
};

function ContactChannels() {
  const cards: [string, string, string, string, string, string][] = [
    ["whatsapp", "WhatsApp us", CONTACT.waLabel, "Fastest reply · within minutes in working hours", CONTACT.wa, "Open chat"],
    ["mail", "Email us", "support@aranyaceylon.com", "A real reply within one business day", "mailto:support@aranyaceylon.com", "Write an email"],
    ["phone", "Call the house", CONTACT.phone, CONTACT.hours, "tel:+94812490000", "Call now"],
  ];
  return (
    <section style={{ background: "var(--bg)", padding: "0 0 18px" }}>
      <div className="home-section-pad ct-channels" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, transform: "translateY(-44px)" }}>
        {cards.map(([icon, title, val, note, href, cta], i) => (
          <Reveal key={title} delay={i * 70}>
            <a href={href} style={{ display: "block", height: "100%", background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "26px 24px", boxShadow: "var(--shadow-md)", transition: "transform .18s, box-shadow .18s" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--line)", marginBottom: 18 }}>
                <SIcon name={icon} size={23} stroke="var(--brand)" />
              </div>
              <h3 className="disp" style={{ fontSize: 23, color: "var(--ink)", margin: "0 0 4px", lineHeight: 1.1 }}>{title}</h3>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 700, color: "var(--brand)", margin: "6px 0 8px", wordBreak: "break-word" }}>{val}</div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.5 }}>{note}</p>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 7 }}>{cta}<SIcon name="arrow" size={16} stroke="var(--accent)" w={2} /></span>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

interface CForm { name: string; email: string; order: string; subject: string; message: string; consent: boolean; }
const EMPTY_CFORM: CForm = { name: "", email: "", order: "", subject: "", message: "", consent: false };

function ContactMain({ market }: { market: Market }) {
  const [done, setDone] = React.useState(false);
  const [ref, setRef] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [f, setF] = React.useState<CForm>(EMPTY_CFORM);
  const set = (k: keyof CForm, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const local = market === "local";
  const btn = local ? "btn btn-local" : "btn btn-intl";
  const subjects = ["Order help & tracking", "Returns & refunds", "Product question", "Wholesale & trade", "Press & partnerships", "Something else"];

  const [submitting, setSubmitting] = React.useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitContact({ name: f.name, email: f.email, order: f.order || undefined, subject: f.subject, message: f.message, consent: f.consent });
      // Only show the confirmation on a REAL success — never fabricate a
      // reference for a submission the backend never received (BUG-10).
      setRef(res.ref);
      setDone(true);
    } catch (err) {
      setError((err as Error)?.message || "Sorry — your message couldn't be sent. Please try again, or email us directly at hello@aranyaceylon.com.");
    } finally {
      setSubmitting(false);
    }
  };

  const field = (label: string, key: keyof CForm, type = "text", ph = "", req = true) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, color: "var(--ink)", letterSpacing: ".01em" }}>{label}{req && <span style={{ color: "var(--accent)" }}> *</span>}</span>
      <input required={req} type={type} placeholder={ph} value={f[key] as string} onChange={(e) => set(key, e.target.value)} className="sp-input" />
    </label>
  );

  return (
    <section style={{ background: "var(--bg)", padding: "30px 0 100px" }}>
      <div className="home-section-pad ct-main" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 56, alignItems: "start" }}>
        <Reveal>
          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 18, boxShadow: "var(--shadow-md)", padding: "clamp(26px,3vw,42px)" }}>
            {done ? (
              <div style={{ textAlign: "center", padding: "26px 6px" }}>
                <div style={{ width: 62, height: 62, borderRadius: 999, background: local ? "var(--brand)" : "var(--accent)", display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
                  <SIcon name="check" size={30} stroke="#fff" w={2.4} />
                </div>
                <h3 className="disp" style={{ fontSize: 32, color: "var(--brand)", margin: "0 0 12px", lineHeight: 1.05 }}>Message on its way</h3>
                <p className="prose" style={{ fontSize: 16, color: "var(--ink)", margin: "0 auto 8px", maxWidth: 380 }}>
                  Thank you, {f.name ? f.name.split(" ")[0] : "there"}. Your ticket reference is <b style={{ color: "var(--accent)" }}>{ref}</b>. We&rsquo;ll reply to {f.email || "your inbox"} within one business day.
                </p>
                <button className="btn btn-ghost" style={{ width: "auto", padding: "12px 24px", margin: "20px auto 0" }} onClick={() => { setDone(false); setF(EMPTY_CFORM); }}>Send another</button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h2 className="disp" style={{ fontSize: 28, color: "var(--brand)", margin: "0 0 4px", lineHeight: 1.1 }}>Send us a message</h2>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--muted)", margin: "0 0 24px" }}>Fields marked <span style={{ color: "var(--accent)" }}>*</span> are required.</p>
                <div className="ct-grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  {field("Your name", "name", "text", "Full name")}
                  {field("Email", "email", "email", "you@email.com")}
                  <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>What&rsquo;s it about?<span style={{ color: "var(--accent)" }}> *</span></span>
                    <select required value={f.subject} onChange={(e) => set("subject", e.target.value)} className="sp-input" style={{ appearance: "none", cursor: "pointer" }}>
                      <option value="" disabled>Choose a topic</option>
                      {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  {field("Order number", "order", "text", "AC-12345 (if any)", false)}
                </div>
                <label style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 18 }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>Your message<span style={{ color: "var(--accent)" }}> *</span></span>
                  <textarea required value={f.message} onChange={(e) => set("message", e.target.value)} className="sp-input" rows={5} placeholder="Tell us what's going on — the more detail, the faster we can help." style={{ resize: "vertical", lineHeight: 1.6 }}></textarea>
                </label>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 18, cursor: "pointer" }}>
                  <input type="checkbox" required checked={f.consent} onChange={(e) => set("consent", e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, accentColor: "var(--brand)" }} />
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>I agree that Aranya Ceylon may use my details to respond to this enquiry. We never share them.</span>
                </label>
                {error && <div role="alert" style={{ marginTop: 18, padding: "11px 14px", borderRadius: 9, background: "rgba(192,83,31,.1)", border: "1px solid rgba(192,83,31,.35)", color: "#C0531F", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600 }}>{error}</div>}
                <button type="submit" className={btn} style={{ marginTop: 24, padding: "15px", opacity: submitting ? 0.6 : 1 }} disabled={submitting}>{submitting ? "Sending…" : "Send message"}</button>
              </form>
            )}
          </div>
        </Reveal>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <Reveal delay={80}>
            <div>
              <Eyebrow>Email the right desk</Eyebrow>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
                {CONTACT.emails.map(([icon, title, addr, note]) => (
                  <a key={addr} href={"mailto:" + addr} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 13, padding: "16px 16px", transition: "border-color .15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--brand)")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, flex: "0 0 auto", display: "grid", placeItems: "center", background: "#fff", border: "1px solid var(--line)" }}><SIcon name={icon} size={18} stroke="var(--brand)" /></div>
                    <div>
                      <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{title}</div>
                      <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--brand)", fontWeight: 600, margin: "2px 0 4px", wordBreak: "break-word" }}>{addr}</div>
                      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", lineHeight: 1.45 }}>{note}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={130}>
            <div style={{ background: "var(--brand)", color: "#FDFAF5", borderRadius: 16, padding: "24px 24px" }}>
              <div className="eyebrow" style={{ color: "#E6B860", marginBottom: 14 }}>Response times</div>
              {([["whatsapp", "WhatsApp", "Minutes, in working hours"], ["mail", "Email", "Within one business day"], ["headset", "Order issues", "Same day, Mon–Sat"]] as [string, string, string][]).map(([ic, t, v]) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: t === "Order issues" ? "none" : "1px solid rgba(253,250,245,.16)" }}>
                  <SIcon name={ic} size={18} stroke="#E6B860" />
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, flex: 1 }}>{t}</span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "rgba(253,250,245,.78)", textAlign: "right" }}>{v}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={170}>
            <div>
              <div className="eyebrow" style={{ color: "var(--muted)", marginBottom: 14 }}>Follow the harvest</div>
              <div style={{ display: "flex", gap: 10 }}>
                {([["Instagram", "@aranyaceylon"], ["Facebook", "/aranyaceylon"], ["Pinterest", "/aranyaceylon"]] as [string, string][]).map(([s, h]) => (
                  <a key={s} href="#" style={{ flex: 1, textAlign: "center", background: "#fff", border: "1px solid var(--line)", borderRadius: 11, padding: "13px 8px", transition: "border-color .15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--brand)")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}>
                    <span style={{ width: 9, height: 9, borderRadius: 9, background: "var(--accent)", display: "inline-block", marginBottom: 8 }} />
                    <span style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{s}</span>
                    <span style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{h}</span>
                  </a>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ContactVisit() {
  return (
    <section style={{ background: "var(--surface)", padding: "92px 0", borderTop: "1px solid var(--line)" }}>
      <div className="home-section-pad ct-visit" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 52, alignItems: "center" }}>
        <div>
          <Reveal><Eyebrow>Find us</Eyebrow></Reveal>
          <Reveal delay={60}><h2 className="disp" style={{ fontSize: "clamp(30px,3.6vw,48px)", color: "var(--brand)", margin: "14px 0 0", lineHeight: 1.05 }}>The spice house in Kandy</h2></Reveal>
          <Reveal delay={110}><p className="prose" style={{ fontSize: 16.5, color: "var(--muted)", margin: "18px 0 26px", maxWidth: 420 }}>
            Our milling room and trade counter sit in the hill country, a short drive from the Temple of the Tooth. Visits are by appointment — we&rsquo;ll put the kettle on.
          </p></Reveal>
          <Reveal delay={150}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {([["pin", CONTACT.address.join(", ")], ["clock", CONTACT.hours], ["phone", CONTACT.phone]] as [string, string][]).map(([ic, t]) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, flex: "0 0 auto", display: "grid", placeItems: "center", background: "#fff", border: "1px solid var(--line)" }}><SIcon name={ic} size={18} stroke="var(--brand)" /></div>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--ink)", fontWeight: 500 }}>{t}</span>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={190}>
            <a href="#" className="btn btn-ghost" style={{ width: "auto", padding: "13px 24px", display: "inline-flex", alignItems: "center", gap: 9, marginTop: 28 }}>
              <SIcon name="pin" size={17} stroke="var(--brand)" />Get directions
            </a>
          </Reveal>
        </div>
        <Reveal delay={90}>
          <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", aspectRatio: "4 / 3", boxShadow: "var(--shadow-lg)", border: "1px solid var(--line)" }}>
            <ImageSlot id="contact-map" shape="rect" fit="cover" placeholder="Drop a map screenshot or storefront photo of the Kandy spice house" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
            <div style={{ position: "absolute", left: "50%", top: "44%", transform: "translate(-50%,-100%)", pointerEvents: "none", filter: "drop-shadow(0 6px 10px rgba(0,0,0,.3))" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", background: "var(--accent)", display: "grid", placeItems: "center", border: "2px solid #fff" }}>
                <span style={{ transform: "rotate(45deg)", display: "grid", placeItems: "center" }}><SIcon name="leaf" size={18} stroke="#fff" w={2} /></span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function ContactClient() {
  const { market } = useMarket();
  return (
    <div data-screen-label="Contact">
      <SupportHeader active="Contact" eyebrow="Support · Contact"
        title={<>We&rsquo;re here<br />to help.</>}
        lead="Order question, product curiosity, or a wholesale enquiry — reach the right desk and a real person in Kandy will get back to you." />
      <ContactChannels />
      <ContactMain market={market} />
      <ContactVisit />
    </div>
  );
}
