/* Aranya Ceylon — LEGAL cluster shared parts.
   Dark branded header with a three-tab cluster nav (Privacy · Terms · Cookies),
   a two-column body: sticky table-of-contents sidebar + long-form .prose content.
   Long-form legal copy uses --font-read (Spectral) per the type system.
   Depends on home-common.jsx (Reveal, Liyawel, Eyebrow), support-common.jsx (SIcon).
   Exports LegalHeader, LegalLayout, and prose primitives LP / LH / LUL / LCallout. */
const { useState: lUse, useEffect: lEffect, useRef: lRef } = React;

/* ---------------- cluster tabs ---------------- */
function LegalTabs({ active }) {
  const tabs = [["Privacy", "Privacy.html"], ["Terms", "Terms.html"], ["Cookies", "Cookies.html"]];
  return (
    <div style={{ display: "inline-flex", flexWrap: "wrap", justifyContent: "center", gap: 8, background: "rgba(253,250,245,.06)", border: "1px solid rgba(253,250,245,.16)", borderRadius: 999, padding: 5 }}>
      {tabs.map(([label, href]) => {
        const on = label === active;
        return (
          <a key={label} href={href} style={{
            fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, letterSpacing: ".01em",
            padding: "10px 22px", borderRadius: 999, whiteSpace: "nowrap", transition: "background .18s, color .18s",
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

/* ---------------- dark branded header ---------------- */
function LegalHeader({ active, title, lead, updated }) {
  return (
    <header data-hero style={{ position: "relative", background: "#1A1A1A", color: "#FDFAF5", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 50% -10%, rgba(15,110,86,.28), transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(230,184,96,.4), transparent)" }} />
      <div className="home-section-pad" style={{ position: "relative", maxWidth: 1020, margin: "0 auto", padding: "166px 40px 56px", textAlign: "center" }}>
        <Reveal><Eyebrow center light>Legal</Eyebrow></Reveal>
        <Reveal delay={60}>
          <h1 className="disp" style={{ fontSize: "clamp(40px,5.4vw,76px)", lineHeight: 1.02, margin: "18px 0 0", fontWeight: 600, letterSpacing: ".005em" }}>{title}</h1>
        </Reveal>
        {lead && (
          <Reveal delay={120}>
            <p className="prose" style={{ fontSize: "clamp(16px,1.4vw,19px)", color: "rgba(253,250,245,.82)", margin: "22px auto 0", maxWidth: 600 }}>{lead}</p>
          </Reveal>
        )}
        {updated && (
          <Reveal delay={150}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 22, padding: "7px 15px", borderRadius: 999, background: "rgba(253,250,245,.07)", border: "1px solid rgba(253,250,245,.16)" }}>
              <SIcon name="clock" size={14} stroke="#E6B860" w={1.8} />
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, letterSpacing: ".01em", color: "rgba(253,250,245,.78)" }}>Last updated {updated}</span>
            </div>
          </Reveal>
        )}
        <Reveal delay={190}>
          <div style={{ marginTop: 34 }}><LegalTabs active={active} /></div>
        </Reveal>
      </div>
    </header>
  );
}

/* ---------------- prose primitives (Spectral long-form) ---------------- */
function LP({ children, lead }) {
  return <p className="prose" style={{ fontSize: lead ? 18 : 16.5, color: lead ? "var(--ink)" : "var(--muted)", margin: "0 0 18px", maxWidth: 680 }}>{children}</p>;
}
function LH({ children }) {
  return <h3 className="disp" style={{ fontSize: 23, color: "var(--ink)", margin: "30px 0 12px", lineHeight: 1.14, fontWeight: 600 }}>{children}</h3>;
}
function LUL({ items }) {
  return (
    <ul className="prose" style={{ fontSize: 16.5, color: "var(--muted)", margin: "0 0 18px", padding: 0, listStyle: "none", maxWidth: 680, display: "flex", flexDirection: "column", gap: 11 }}>
      {items.map((it, i) => (
        <li key={i} style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
          <span style={{ flex: "0 0 auto", width: 6, height: 6, borderRadius: 999, background: "var(--gold-line)", marginTop: 11 }} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
function LCallout({ icon = "shield", children }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", margin: "8px 0 22px", padding: "18px 20px", background: "var(--surface)", border: "1px solid var(--line)", borderLeft: "3px solid var(--brand)", borderRadius: 10, maxWidth: 700 }}>
      <span style={{ flex: "0 0 auto", marginTop: 1 }}><SIcon name={icon} size={20} stroke="var(--brand)" /></span>
      <p className="prose" style={{ fontSize: 15, color: "var(--ink)", margin: 0, lineHeight: 1.62 }}>{children}</p>
    </div>
  );
}

/* ---------------- two-column body with sticky TOC + scrollspy ---------------- */
function LegalLayout({ sections, market = "intl" }) {
  const [activeId, setActiveId] = lUse(sections[0] && sections[0].id);
  const obsRef = lRef(null);

  lEffect(() => {
    const opts = { rootMargin: "-30% 0px -60% 0px", threshold: 0 };
    const cb = (entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActiveId(e.target.id); });
    };
    const io = new IntersectionObserver(cb, opts);
    sections.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el); });
    obsRef.current = io;
    return () => io.disconnect();
  }, [sections]);

  const jump = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.pageYOffset - 96;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <section style={{ background: "var(--bg)", padding: "72px 0 96px" }}>
      <div className="home-section-pad legal-grid" style={{ maxWidth: 1080, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "232px 1fr", gap: 64, alignItems: "start" }}>

        {/* TOC */}
        <aside className="legal-toc" style={{ position: "sticky", top: 96 }}>
          <div className="eyebrow" style={{ color: "var(--muted)", marginBottom: 16 }}>On this page</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2, borderLeft: "1px solid var(--line)" }}>
            {sections.map((s, i) => {
              const on = s.id === activeId;
              return (
                <a key={s.id} href={"#" + s.id} onClick={(e) => jump(e, s.id)} style={{
                  fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: on ? 700 : 500, lineHeight: 1.4,
                  color: on ? "var(--brand)" : "var(--muted)", padding: "8px 0 8px 16px", marginLeft: -1,
                  borderLeft: on ? "2px solid var(--brand)" : "2px solid transparent", transition: "color .15s, border-color .15s",
                }}
                  onMouseEnter={(e) => { if (!on) e.currentTarget.style.color = "var(--ink)"; }}
                  onMouseLeave={(e) => { if (!on) e.currentTarget.style.color = "var(--muted)"; }}>
                  {s.title}
                </a>
              );
            })}
          </nav>
          <a href="#" onClick={(e) => { e.preventDefault(); window.print(); }} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 26, fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "var(--muted)" }}>
            <SIcon name="receipt" size={15} stroke="var(--muted)" w={1.7} />Print / save as PDF
          </a>
        </aside>

        {/* content */}
        <div className="legal-content" style={{ minWidth: 0 }}>
          {sections.map((s, i) => (
            <Reveal key={s.id}>
              <div id={s.id} style={{ paddingTop: i === 0 ? 0 : 44, marginTop: i === 0 ? 0 : 44, borderTop: i === 0 ? "none" : "1px solid var(--line)", scrollMarginTop: 96 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 13, marginBottom: 16 }}>
                  <span className="disp" style={{ fontSize: 20, color: "var(--gold-line)", fontWeight: 600, lineHeight: 1, flex: "0 0 auto" }}>{("0" + (i + 1)).slice(-2)}</span>
                  <h2 className="disp" style={{ fontSize: "clamp(26px,2.6vw,34px)", color: "var(--brand)", margin: 0, lineHeight: 1.06, fontWeight: 600 }}>{s.title}</h2>
                </div>
                <div>{s.body}</div>
              </div>
            </Reveal>
          ))}

          {/* contact footer block */}
          <Reveal>
            <div style={{ marginTop: 52, padding: "26px 28px", background: "#1A1A1A", color: "#FDFAF5", borderRadius: 16, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 120% at 100% 0%, rgba(15,110,86,.26), transparent 55%)", pointerEvents: "none" }} />
              <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div className="eyebrow" style={{ color: "#E6B860", marginBottom: 8 }}>Questions about this policy?</div>
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, color: "rgba(253,250,245,.82)", margin: 0, lineHeight: 1.6, maxWidth: 420 }}>
                    Write to our team in Kandy at <a href="mailto:privacy@aranyaceylon.com" style={{ color: "#E6B860", fontWeight: 700 }}>privacy@aranyaceylon.com</a> and a real person will reply within a business day.
                  </p>
                </div>
                <a href="Contact.html" className={market === "local" ? "btn btn-local" : "btn btn-intl"} style={{ width: "auto", padding: "13px 26px", display: "inline-block", whiteSpace: "nowrap" }}>Contact us</a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { LegalHeader, LegalTabs, LegalLayout, LP, LH, LUL, LCallout });
