/* Aranya Ceylon — Product Detail: editorial sections (part 2).
   ForestStory · FlavourProfile · SpecTable · Pairings · ReviewsBlock · Related.
   Depends on pdContent (part 1), Liyawel/Eyebrow (home-common), CardCFinal (cards), Stars (shared). */

/* ============ "From the forest" — long-form prose (Spectral) ============ */
function ForestStory({ spice }) {
  const c = pdContent(spice);
  return (
    <section style={{ background: "var(--bg)", padding: "96px 0 40px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px" }}>
        <Liyawel width={220} style={{ marginBottom: 34 }} />
        <Eyebrow center color="var(--accent)">From the forest</Eyebrow>
        <h2 className="disp" style={{ fontSize: 44, color: "var(--brand)", textAlign: "center", margin: "18px 0 52px", lineHeight: 1.06 }}>
          {c.storyTitle}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "start", maxWidth: 980, margin: "0 auto" }}>
          {c.story.map((p, i) => (
            <p key={i} className="prose" style={{ fontSize: 17.5, color: "var(--ink)", margin: 0 }} dangerouslySetInnerHTML={{ __html: p }} />
          ))}
        </div>
        {/* pull quote */}
        <figure style={{ maxWidth: 760, margin: "60px auto 0", textAlign: "center" }}>
          <blockquote className="disp" style={{ fontSize: 30, fontStyle: "italic", color: "var(--brand)", lineHeight: 1.3, margin: 0, fontWeight: 500 }}>
            “{c.quote}”
          </blockquote>
          <figcaption style={{ fontFamily: "var(--font-ui)", fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, marginTop: 18 }}>
            — {c.quoteBy}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

/* ============ Flavour profile + specifications (two-up on surface) ============ */
function FlavourProfile({ spice }) {
  const c = pdContent(spice);
  return (
    <section style={{ background: "var(--surface)", padding: "84px 0" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "start" }}>
        {/* flavour bars */}
        <div>
          <Eyebrow color="var(--accent)">Flavour profile</Eyebrow>
          <h3 className="disp" style={{ fontSize: 32, color: "var(--ink)", margin: "14px 0 30px", lineHeight: 1.1 }}>How it tastes</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {c.flavour.map(([label, val]) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{label}</span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "var(--muted)" }}>{val}</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: "rgba(26,26,26,.06)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: val + "%", borderRadius: 999,
                    background: `linear-gradient(90deg, ${spice.base}, ${spice.color})` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* specs table */}
        <div>
          <Eyebrow color="var(--accent)">Specifications</Eyebrow>
          <h3 className="disp" style={{ fontSize: 32, color: "var(--ink)", margin: "14px 0 30px", lineHeight: 1.1 }}>The details</h3>
          <dl style={{ margin: 0 }}>
            {c.specs.map(([k, v], i) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "baseline",
                padding: "13px 0", borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                <dt style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", flex: "0 0 auto" }}>{k}</dt>
                <dd style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: 0, textAlign: "right" }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* ============ Pairings + how to use ============ */
function Pairings({ spice }) {
  const c = pdContent(spice);
  return (
    <section style={{ background: "var(--bg)", padding: "84px 0" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <Eyebrow center color="var(--accent)">In the kitchen</Eyebrow>
          <h2 className="disp" style={{ fontSize: 40, color: "var(--brand)", margin: "16px 0 24px", lineHeight: 1.06 }}>Ways to use it</h2>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 9, maxWidth: 640, margin: "0 auto" }}>
            {c.pairings.map((p) => (
              <span key={p} style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--brand)",
                border: "1px solid var(--line)", background: "#fff", borderRadius: 999, padding: "8px 15px" }}>{p}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {c.uses.map(([title, body], i) => (
            <div key={title} style={{ background: "var(--surface)", borderRadius: 8, padding: "28px 26px", borderTop: `4px solid ${spice.color}` }}>
              <div className="disp" style={{ fontSize: 26, color: "rgba(26,26,26,.14)", fontWeight: 600, lineHeight: 1, marginBottom: 12 }}>0{i + 1}</div>
              <h4 className="disp" style={{ fontSize: 23, color: "var(--ink)", margin: "0 0 10px", lineHeight: 1.1 }}>{title}</h4>
              <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ Reviews ============ */
const PD_REVIEWS = [
  { name: "Priya M.", loc: "London, UK", rating: 5, title: "The real thing, finally", body: "After years of cassia I'd forgotten cinnamon could taste floral. The quills crumble to nothing in milk. Bought the 250g and already need more." },
  { name: "Daniel R.", loc: "Berlin, DE", rating: 5, title: "Aroma fills the room", body: "Opened the pouch and the whole kitchen turned warm and sweet. You can tell it was packed recently — nothing flat about it." },
  { name: "Anoushka F.", loc: "Colombo, LK", rating: 4, title: "Lovely, ships fast", body: "Grew up with this but never this graded. Used it in kiribath for new year and the family noticed. Knocking one star only for the price — but it's worth it." },
];
function ReviewsBlock({ spice }) {
  const dist = [[5, 78], [4, 16], [3, 4], [2, 1], [1, 1]];
  return (
    <section id="reviews" style={{ background: "var(--surface)", padding: "84px 0" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px" }}>
        <Eyebrow color="var(--accent)">What people say</Eyebrow>
        <h2 className="disp" style={{ fontSize: 40, color: "var(--brand)", margin: "16px 0 40px", lineHeight: 1.06 }}>{spice.reviews} reviews</h2>
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 56, alignItems: "start" }}>
          {/* summary */}
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
              <span className="disp" style={{ fontSize: 64, color: "var(--ink)", fontWeight: 600, lineHeight: 1 }}>{spice.rating}</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", fontWeight: 600 }}>/ 5</span>
            </div>
            <Stars rating={spice.rating} showNum={false} size={18} />
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", marginTop: 12 }}>Based on {spice.reviews} verified buyers</div>
            <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 8 }}>
              {dist.map(([star, pct]) => (
                <div key={star} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "var(--muted)", width: 30 }}>{star} ★</span>
                  <div style={{ flex: 1, height: 7, borderRadius: 999, background: "rgba(26,26,26,.07)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: pct + "%", background: "var(--accent)", borderRadius: 999 }} />
                  </div>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", width: 32, textAlign: "right" }}>{pct}%</span>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost" style={{ marginTop: 24 }}>Write a review</button>
          </div>
          {/* review list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {PD_REVIEWS.map((r) => (
              <div key={r.name} style={{ background: "#FFFDF9", border: "1px solid var(--line)", borderRadius: 8, padding: "24px 26px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{r.name}</span>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--brand)", background: "rgba(15,110,86,.08)", padding: "3px 7px", borderRadius: 4 }}>Verified</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)" }}>{r.loc}</span>
                  </div>
                  <Stars rating={r.rating} showNum={false} size={14} />
                </div>
                <h4 className="disp" style={{ fontSize: 21, color: "var(--ink)", margin: "0 0 6px", lineHeight: 1.15 }}>{r.title}</h4>
                <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: 0 }}>{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ Related — CardCFinal row ============ */
function Related({ spice, market }) {
  /* Seed from bundled SPICES immediately, then swap in live API products. */
  const [others, setOthers] = React.useState(() =>
    (window.SPICES || []).filter((s) => s.name !== spice.name).slice(0, 4)
  );
  React.useEffect(() => {
    if (!window.AranyaAPI) return;
    let alive = true;
    window.AranyaAPI.getAllProducts()
      .then((r) => {
        if (!alive || !r.items || !r.items.length) return;
        setOthers(r.items.filter((s) => s.name !== spice.name).slice(0, 4));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [spice.name]);
  return (
    <section style={{ background: "var(--bg)", padding: "84px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 34 }}>
          <div>
            <Eyebrow color="var(--accent)">More from the hill country</Eyebrow>
            <h2 className="disp" style={{ fontSize: 38, color: "var(--brand)", margin: "14px 0 0", lineHeight: 1.04 }}>Pairs well with</h2>
          </div>
          <a href="#" style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, color: "var(--brand)", display: "inline-flex", alignItems: "center", gap: 6, paddingBottom: 6 }}>
            Shop all spices <Icon name="chevron" size={14} stroke="var(--brand)" />
          </a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
          {others.map((s) => <CardCFinal key={s.name} spice={s} market={market} />)}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { ForestStory, FlavourProfile, Pairings, ReviewsBlock, Related });
