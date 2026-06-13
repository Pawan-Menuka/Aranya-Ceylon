/* Aranya Ceylon — SUPPORT cluster shared parts.
   Dark branded header with the three-tab cluster nav (Contact · FAQ · Shipping & Returns),
   a stroke icon set (SIcon), and a reusable "still need help" CTA band.
   Depends on home-common.jsx (Reveal, Liyawel, Eyebrow). Exports SupportHeader, SIcon, SupportCTA. */
const { useState: sUseState } = React;

/* ---------------- stroke icon set ---------------- */
function SIcon({ name, size = 22, stroke = "var(--brand)", w = 1.6 }) {
  const p = {
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></>,
    chat: <><path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" /><path d="M8.5 11h7M8.5 14h4.5" /></>,
    whatsapp: <><path d="M21 12a8 8 0 0 1-11.7 7.1L4 21l1.9-5.2A8 8 0 1 1 21 12z" /><path d="M9.2 9.4c-.2 1.2.4 2.6 1.6 3.8s2.6 1.8 3.8 1.6c.5-.1.8-.5.9-1l.1-.7c0-.3-.1-.5-.4-.6l-1.4-.6c-.2-.1-.5 0-.6.2l-.3.4c-.7-.3-1.3-.9-1.6-1.6l.4-.3c.2-.1.3-.4.2-.6l-.6-1.4c-.1-.3-.4-.4-.7-.4l-.6.1c-.5.1-.9.4-1 .9z" /></>,
    phone: <><path d="M5 4h3.3l1.5 4-2 1.4a11 11 0 0 0 5.3 5.3l1.4-2 4 1.5V19a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z" /></>,
    pin: <><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    truck: <><path d="M2 6h12v10H2zM14 9h4l3 3v4h-7z" /><circle cx="6.5" cy="18" r="1.8" /><circle cx="17.5" cy="18" r="1.8" /></>,
    box: <><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7M12 11v10" /></>,
    leaf: <><path d="M11 21C5 18 4 9 20 4c1 9-3 16-12 14-2-4 1-9 7-11" /></>,
    shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></>,
    refresh: <><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" /><path d="M21 4v4h-4" /><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" /><path d="M3 20v-4h4" /></>,
    receipt: <><path d="M5 3h14v18l-3-1.6-3 1.6-3-1.6L5 21V3z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" /></>,
    headset: <><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><path d="M4 13h2.5a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4zM20 13h-2.5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1H19a1 1 0 0 0 1-1v-4z" /><path d="M20 17v1a3 3 0 0 1-3 3h-3" /></>,
    check: <path d="M5 12l5 5L20 6" />,
    chevron: <path d="M6 9l6 6 6-6" />,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
    spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
    plane: <><path d="M21 4L3 11l6 2 2 6 3-5 5 5 2-15z" /></>,
    flag: <><path d="M5 21V4M5 4h11l-2 3 2 3H5" /></>,
  }[name];
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>{p}</svg>;
}

/* ---------------- cluster tabs ---------------- */
function SupportTabs({ active }) {
  const tabs = [["Contact", "Contact.html"], ["FAQ", "FAQ.html"], ["Shipping & Returns", "Shipping.html"]];
  return (
    <div style={{ display: "inline-flex", flexWrap: "wrap", justifyContent: "center", gap: 8, background: "rgba(253,250,245,.06)", border: "1px solid rgba(253,250,245,.16)", borderRadius: 999, padding: 5 }}>
      {tabs.map(([label, href]) => {
        const on = label === active;
        return (
          <a key={label} href={href} style={{
            fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, letterSpacing: ".01em",
            padding: "10px 20px", borderRadius: 999, whiteSpace: "nowrap", transition: "background .18s, color .18s",
            background: on ? "#E6B860" : "transparent", color: on ? "#1A1A1A" : "rgba(253,250,245,.82)",
          }}
            onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "rgba(253,250,245,.1)"; }}
            onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
            {label}
          </a>
        );
      })}
    </div>
  );
}

/* ---------------- dark branded header (shared across the three pages) ---------------- */
function SupportHeader({ active, title, lead, eyebrow = "Support" }) {
  return (
    <header data-hero style={{ position: "relative", background: "#1A1A1A", color: "#FDFAF5", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 50% -10%, rgba(15,110,86,.28), transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(230,184,96,.4), transparent)" }} />
      <div className="home-section-pad" style={{ position: "relative", maxWidth: 1020, margin: "0 auto", padding: "166px 40px 56px", textAlign: "center" }}>
        <Reveal><Eyebrow center light>{eyebrow}</Eyebrow></Reveal>
        <Reveal delay={60}>
          <h1 className="disp" style={{ fontSize: "clamp(40px,5.4vw,76px)", lineHeight: 1.02, margin: "18px 0 0", fontWeight: 600, letterSpacing: ".005em" }}>{title}</h1>
        </Reveal>
        {lead && (
          <Reveal delay={120}>
            <p className="prose" style={{ fontSize: "clamp(16px,1.4vw,19px)", color: "rgba(253,250,245,.82)", margin: "22px auto 0", maxWidth: 580 }}>{lead}</p>
          </Reveal>
        )}
        <Reveal delay={170}>
          <div style={{ marginTop: 38 }}><SupportTabs active={active} /></div>
        </Reveal>
      </div>
    </header>
  );
}

/* ---------------- reusable "still need help" CTA band ---------------- */
function SupportCTA({ market = "intl", exclude }) {
  const btn = market === "local" ? "btn btn-local" : "btn btn-intl";
  return (
    <section style={{ background: "var(--brand)", color: "#FDFAF5", padding: "84px 0", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 120% at 50% 0%, rgba(230,184,96,.16), transparent 55%)", pointerEvents: "none" }} />
      <div className="home-section-pad" style={{ position: "relative", maxWidth: 760, margin: "0 auto", padding: "0 40px", textAlign: "center" }}>
        <Reveal><Liyawel width={200} color="rgba(230,184,96,.6)" style={{ marginBottom: 26 }} /></Reveal>
        <Reveal delay={60}>
          <h2 className="disp" style={{ fontSize: "clamp(30px,3.6vw,46px)", margin: 0, fontWeight: 600, lineHeight: 1.06 }}>Still need a hand?</h2>
        </Reveal>
        <Reveal delay={110}>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 15.5, color: "rgba(253,250,245,.82)", margin: "16px auto 30px", maxWidth: 480, lineHeight: 1.62 }}>
            Our team in Kandy answers within a business day. Reach us however suits you — a real person will reply.
          </p>
        </Reveal>
        <Reveal delay={150}>
          <div style={{ display: "flex", gap: 13, justifyContent: "center", flexWrap: "wrap" }}>
            {exclude !== "contact" && <a href="Contact.html" className={btn} style={{ width: "auto", padding: "14px 28px", display: "inline-block" }}>Contact us</a>}
            <a href="https://wa.me/94812490000" style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, letterSpacing: ".02em", padding: "14px 26px", borderRadius: "var(--radius)", background: "rgba(253,250,245,.12)", color: "#FDFAF5", border: "1px solid rgba(253,250,245,.34)", display: "inline-flex", alignItems: "center", gap: 9 }}>
              <SIcon name="whatsapp" size={18} stroke="#FDFAF5" />Chat on WhatsApp
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

Object.assign(window, { SIcon, SupportTabs, SupportHeader, SupportCTA });
