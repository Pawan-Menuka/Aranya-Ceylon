/* Aranya Ceylon — MOBILE Journal index + Article (ports of journal.jsx + article.jsx).
   Journal: forest header, featured spotlight, category chips, post cards.
   Article: dark photo header, dek, Liyawel, body (h/p/quote/img), author, related.
   Internal list<->article navigation. Standalone <MobileArticle> also exported for the showcase.
   Depends on mobile-pages-common.jsx, journal-data.js (JOURNAL, JOURNAL_CATEGORIES),
   home-common.jsx (Eyebrow, Liyawel), shared.jsx. */
const { useState: mjUse, useMemo: mjMemo } = React;

function MPostImage({ post, ratio = "3 / 2", radius = 9 }) {
  return (
    <div style={{ position: "relative", borderRadius: radius, overflow: "hidden", aspectRatio: ratio }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${post.accent}, ${post.accent}99)` }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 60% at 70% 20%, rgba(255,255,255,.12), transparent 60%)" }} />
    </div>
  );
}
function MCatTag({ children, accent }) {
  return (
    <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: accent, display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 14, height: 1.5, background: accent }} />{children}
    </span>
  );
}
function MPostMeta({ post, color = "var(--muted)" }) {
  return <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color, fontWeight: 500 }}>{post.author}{post.role ? " · " + post.role : ""} · {post.date} · {post.readTime} read</span>;
}

/* fallback body for posts without full body (mirrors article.jsx) */
function mjFallback(post) {
  return [
    { t: "p", text: "Every spice we sell carries a story like this one — of a hillside, a season, and a pair of hands that knew exactly when to pick. " + post.dek },
    { t: "h", text: "Single-origin, by conviction" },
    { t: "p", text: "We trace each lot to a named estate or smallholding, visit at harvest, and taste at the source. What grows on one hillside arrives in one pouch — no blending, no bulking, no anonymity." },
    { t: "quote", text: "Spice, as the forest intended.", by: "Aranya Ceylon" },
    { t: "p", text: "It is slower and costlier than the warehouse model, and it is the only way we know to keep the aroma that made the spice worth growing." },
    { t: "img", id: "x", cap: "From the hill forests of the Central Highlands." },
  ];
}

/* ============ ARTICLE view ============ */
function MArticleView({ post, market, onBack }) {
  const blocks = post.body && post.body.length ? post.body : mjFallback(post);
  const related = window.JOURNAL.filter((p) => p.slug !== post.slug).slice(0, 3);
  return (
    <div style={{ minHeight: "100%", background: "var(--bg)" }}>
      {/* dark photo header */}
      <header style={{ position: "relative", minHeight: 420, background: "#161412", color: "#FDFAF5", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${post.accent}, ${post.accent}66)` }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,8,6,.55) 0%, transparent 36%, transparent 48%, rgba(10,8,6,.9) 100%)" }} />
        <div style={{ position: "relative", zIndex: 2 }}>
          <MPageBar title={post.category} onBack={onBack} />
        </div>
        <div style={{ position: "relative", marginTop: "auto", padding: "0 22px 30px", textAlign: "center" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#E6B860", display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ width: 16, height: 1.5, background: "#E6B860" }} />{post.category}
          </span>
          <h1 className="disp" style={{ fontSize: "clamp(28px,8vw,36px)", lineHeight: 1.06, margin: "0 0 16px", fontWeight: 600 }}>{post.title}</h1>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "rgba(253,250,245,.82)", fontWeight: 500 }}>{post.author}{post.role ? " · " + post.role : ""} · {post.date} · {post.readTime} read</div>
        </div>
      </header>

      {/* body */}
      <article style={{ padding: "30px 22px 40px" }}>
        <p className="prose" style={{ fontSize: 19, color: "var(--muted)", lineHeight: 1.5, margin: "0 0 18px", fontWeight: 500, fontStyle: "italic" }}>{post.dek}</p>
        <Liyawel width={150} style={{ margin: "8px 0 26px", justifyContent: "flex-start" }} />
        {blocks.map((b, i) => {
          if (b.t === "h") return <h2 key={i} className="disp" style={{ fontSize: 27, color: "var(--brand)", margin: "32px 0 12px", lineHeight: 1.12 }}>{b.text}</h2>;
          if (b.t === "quote") return (
            <figure key={i} style={{ margin: "30px 0", paddingLeft: 20, borderLeft: "3px solid var(--gold-line)" }}>
              <blockquote className="disp" style={{ fontSize: 24, fontStyle: "italic", color: "var(--ink)", lineHeight: 1.3, margin: 0, fontWeight: 500 }}>“{b.text}”</blockquote>
              {b.by && <figcaption style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, marginTop: 12 }}>— {b.by}</figcaption>}
            </figure>
          );
          if (b.t === "img") return (
            <figure key={i} style={{ margin: "28px 0" }}>
              <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "16 / 10", boxShadow: "var(--shadow-md)" }}>
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${post.accent}, ${post.accent}77)` }} />
              </div>
              {b.cap && <figcaption style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", marginTop: 10, textAlign: "center", fontStyle: "italic" }}>{b.cap}</figcaption>}
            </figure>
          );
          return <p key={i} className="prose" style={{ fontSize: 17, color: "var(--ink)", margin: "0 0 18px", lineHeight: 1.68 }} dangerouslySetInnerHTML={{ __html: b.text }} />;
        })}

        {/* author */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 40, padding: "22px 0", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
          <div style={{ width: 48, height: 48, borderRadius: 999, background: post.accent, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
            <span className="disp" style={{ color: "#fff", fontSize: 20, fontWeight: 600 }}>{post.author.charAt(0)}</span>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{post.author}</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)" }}>{post.role || "Aranya Ceylon"} · {post.date}</div>
          </div>
        </div>
      </article>

      {/* related */}
      <section style={{ background: "var(--surface)", padding: "40px 22px" }}>
        <Eyebrow>Keep reading</Eyebrow>
        <h2 className="disp" style={{ fontSize: 27, color: "var(--brand)", margin: "10px 0 22px", lineHeight: 1.05 }}>More from the Journal</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {related.map((p) => (
            <div key={p.slug} style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ width: 96, height: 66, flex: "0 0 auto", borderRadius: 8, overflow: "hidden", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${p.accent}, ${p.accent}88)` }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: p.accent, marginBottom: 5 }}>{p.category}</div>
                <h3 className="disp" style={{ fontSize: 17, color: "var(--ink)", margin: 0, lineHeight: 1.14, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>
      <MPageFooter market={market} />
    </div>
  );
}

/* ============ JOURNAL index (with internal nav to article) ============ */
function MobileJournal({ market = "intl" }) {
  const [cat, setCat] = mjUse("All");
  const [openSlug, setOpenSlug] = mjUse(null);
  const posts = window.JOURNAL;
  const featured = posts.find((p) => p.featured) || posts[0];

  if (openSlug) {
    const post = posts.find((p) => p.slug === openSlug);
    return <MArticleView post={post} market={market} onBack={() => setOpenSlug(null)} />;
  }

  const showFeatured = cat === "All";
  const grid = cat === "All" ? posts.filter((p) => p.slug !== featured.slug) : posts.filter((p) => p.category === cat);

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)" }}>
      <MPageBar title="Journal" onBack={() => {}} />
      <MPageHero eyebrow="The Journal" title="Notes from the forest"
        lede="Sourcing stories, spice notes and recipes from the hill country." />

      {/* featured spotlight */}
      {showFeatured && (
        <section style={{ padding: "30px 18px 8px" }}>
          <button onClick={() => setOpenSlug(featured.slug)} style={{ display: "block", width: "100%", textAlign: "left", border: 0, background: "none", padding: 0, cursor: "pointer" }}>
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "16 / 11", boxShadow: "var(--shadow-md)" }}>
              <MPostImage post={featured} ratio="16 / 11" radius={12} />
              <span style={{ position: "absolute", top: 14, left: 14, background: "rgba(253,250,245,.94)", borderRadius: 999, padding: "6px 12px" }}>
                <MCatTag accent={featured.accent}>Featured · {featured.category}</MCatTag>
              </span>
            </div>
            <h2 className="disp" style={{ fontSize: 27, color: "var(--ink)", margin: "16px 0 12px", lineHeight: 1.1 }}>{featured.title}</h2>
            <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: "0 0 14px" }}>{featured.dek}</p>
            <MPostMeta post={featured} />
          </button>
          <div style={{ height: 1, background: "var(--line)", margin: "30px 0 0" }} />
        </section>
      )}

      {/* chips + grid */}
      <section style={{ padding: "26px 18px 8px" }}>
        <div className="noscroll" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 26 }}>
          {window.JOURNAL_CATEGORIES.map((c) => {
            const on = cat === c;
            return <button key={c} onClick={() => setCat(c)} style={{ flex: "0 0 auto", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "8px 16px", borderRadius: 999,
              border: on ? "1px solid var(--brand)" : "1px solid var(--line)", background: on ? "var(--brand)" : "#fff", color: on ? "#fff" : "var(--ink)" }}>{c}</button>;
          })}
        </div>
        {grid.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 0" }}>
            <h3 className="disp" style={{ fontSize: 24, color: "var(--ink)", margin: 0 }}>No posts in {cat} yet</h3>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", marginTop: 8 }}>More stories are on the way.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
            {grid.map((p) => (
              <button key={p.slug} onClick={() => setOpenSlug(p.slug)} style={{ display: "block", width: "100%", textAlign: "left", border: 0, background: "none", padding: 0, cursor: "pointer" }}>
                <MPostImage post={p} />
                <div style={{ paddingTop: 14 }}>
                  <MCatTag accent={p.accent}>{p.category}</MCatTag>
                  <h3 className="disp" style={{ fontSize: 22, color: "var(--ink)", margin: "10px 0 8px", lineHeight: 1.13 }}>{p.title}</h3>
                  <p className="prose" style={{ fontSize: 14.5, color: "var(--muted)", margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.dek}</p>
                  <MPostMeta post={p} />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
      <div style={{ height: 30 }} />
      <MPageFooter market={market} />
    </div>
  );
}

/* standalone article (opens the featured/first post) for the showcase */
function MobileArticle({ market = "intl", slug }) {
  const posts = window.JOURNAL;
  const post = posts.find((p) => p.slug === slug) || posts.find((p) => p.featured) || posts[0];
  return <MArticleView post={post} market={market} onBack={() => {}} />;
}

Object.assign(window, { MobileJournal, MobileArticle, MArticleView });
