/* Aranya Ceylon — Journal index UI.
   Depends on journal-data.js (JOURNAL, JOURNAL_CATEGORIES), home-common.jsx
   (Reveal, Liyawel, Eyebrow), shared.jsx, image-slot.js, navbar.jsx.
   Exports JournalPage. */
const { useState: jUse, useMemo: jMemo } = React;

/* small post thumbnail (image-slot + spice tint so empty slots read on-brand) */
function PostImage({ post, ratio = "3 / 2", radius = 9 }) {
  return (
    <div style={{ position: "relative", borderRadius: radius, overflow: "hidden", aspectRatio: ratio }}>
      <image-slot id={post.slot} shape="rect" fit="cover" placeholder={`Drop a ${post.category.toLowerCase()} photo`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}></image-slot>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(155deg, ${post.accent}33, ${post.accent}aa)`, mixBlendMode: "multiply", pointerEvents: "none" }} />
    </div>
  );
}

function CatTag({ children, accent, onDark }) {
  return (
    <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase",
      color: onDark ? "#fff" : accent, display: "inline-flex", alignItems: "center", gap: 7 }}>
      <span style={{ width: 16, height: 1.5, background: onDark ? "#E6B860" : accent }} />{children}
    </span>
  );
}

function Meta({ post, color = "var(--muted)" }) {
  return (
    <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color, fontWeight: 500 }}>
      {post.author}{post.role ? " · " + post.role : ""} &nbsp;·&nbsp; {post.date} &nbsp;·&nbsp; {post.readTime} read
    </span>
  );
}

/* ---------- header ---------- */
function JournalHeader() {
  return (
    <header style={{ background: "var(--brand)", color: "#FDFAF5", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, opacity: .5, background: "radial-gradient(120% 90% at 88% -10%, rgba(29,158,117,.55) 0%, transparent 52%)" }} />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "132px 40px 56px", position: "relative", textAlign: "center" }}>
        <Reveal><Liyawel width={150} color="rgba(230,184,96,.55)" accent="rgba(230,184,96,.7)" style={{ marginBottom: 22 }} /></Reveal>
        <Reveal delay={60}><Eyebrow center light>The Journal</Eyebrow></Reveal>
        <Reveal delay={100}>
          <h1 className="disp" style={{ fontSize: "clamp(48px,6vw,84px)", lineHeight: 1.0, margin: "16px 0 14px", fontWeight: 600, letterSpacing: ".005em" }}>
            Notes from the forest
          </h1>
        </Reveal>
        <Reveal delay={150}>
          <p className="prose" style={{ fontSize: 18, color: "rgba(253,250,245,.8)", margin: "0 auto", maxWidth: 540 }}>
            Sourcing stories, spice notes and recipes from the hill country — the people, the plants, and how to get the most from both.
          </p>
        </Reveal>
      </div>
    </header>
  );
}

/* ---------- featured spotlight (large, asymmetric) ---------- */
function FeaturedPost({ post }) {
  const [h, setH] = jUse(false);
  return (
    <section style={{ background: "var(--bg)", padding: "64px 0 8px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <Reveal>
          <a href={"Article.html?post=" + post.slug} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
            className="jf-grid" style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 44, alignItems: "center", textDecoration: "none" }}>
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "16 / 11", boxShadow: h ? "var(--shadow-lg)" : "var(--shadow-md)", transition: "box-shadow .3s" }}>
              <PostImage post={post} ratio="16 / 11" radius={12} />
              <span style={{ position: "absolute", top: 18, left: 18, background: "rgba(253,250,245,.94)", borderRadius: 999, padding: "7px 14px" }}>
                <CatTag accent={post.accent}>Featured · {post.category}</CatTag>
              </span>
            </div>
            <div>
              <h2 className="disp" style={{ fontSize: "clamp(30px,3.2vw,44px)", color: "var(--ink)", margin: "0 0 18px", lineHeight: 1.08, letterSpacing: ".005em" }}>{post.title}</h2>
              <p className="prose" style={{ fontSize: 18, color: "var(--muted)", margin: "0 0 22px" }}>{post.dek}</p>
              <Meta post={post} />
              <div style={{ marginTop: 24, fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--brand)", display: "inline-flex", alignItems: "center", gap: 8 }}>
                Read the story
                <span style={{ transform: h ? "translateX(4px)" : "none", transition: "transform .2s" }}>
                  <Icon name="chevron" size={15} stroke="var(--brand)" />
                </span>
              </div>
            </div>
          </a>
        </Reveal>
        <div style={{ height: 1, background: "var(--line)", margin: "60px 0 0" }} />
      </div>
    </section>
  );
}

/* ---------- post card ---------- */
function PostCard({ post }) {
  const [h, setH] = jUse(false);
  return (
    <a href={"Article.html?post=" + post.slug} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "flex", flexDirection: "column", textDecoration: "none" }}>
      <div style={{ boxShadow: h ? "var(--shadow-md)" : "none", borderRadius: 9, transition: "box-shadow .3s", transform: h ? "translateY(-3px)" : "none" }}>
        <PostImage post={post} />
      </div>
      <div style={{ paddingTop: 18 }}>
        <CatTag accent={post.accent}>{post.category}</CatTag>
        <h3 className="disp" style={{ fontSize: 25, color: "var(--ink)", margin: "12px 0 10px", lineHeight: 1.12, letterSpacing: ".005em" }}>{post.title}</h3>
        <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: "0 0 16px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.dek}</p>
        <Meta post={post} />
      </div>
    </a>
  );
}

/* ---------- category chips ---------- */
function JournalChips({ value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center" }}>
      {window.JOURNAL_CATEGORIES.map((c) => {
        const on = value === c;
        return (
          <button key={c} onClick={() => onChange(c)} style={{
            fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, cursor: "pointer", padding: "9px 18px", borderRadius: 999, transition: "all .15s",
            border: on ? "1px solid var(--brand)" : "1px solid var(--line)", background: on ? "var(--brand)" : "#fff", color: on ? "#fff" : "var(--ink)" }}>{c}</button>
        );
      })}
    </div>
  );
}

/* ---------- page ---------- */
function JournalPage({ market, cartCount, onCartClick, onAccountClick }) {
  const [cat, setCat] = jUse("All");
  const posts = window.JOURNAL;
  const featured = posts.find((p) => p.featured) || posts[0];
  const rest = jMemo(() => {
    const pool = posts.filter((p) => p.slug !== featured.slug);
    return cat === "All" ? pool : pool.filter((p) => p.category === cat);
  }, [cat]);
  // when a category is chosen, the featured spotlight is hidden unless it matches
  const showFeatured = cat === "All" || featured.category === cat;
  const grid = (cat === "All") ? rest : posts.filter((p) => p.category === cat && p.slug !== (showFeatured ? "" : featured.slug));

  return (
    <div className="aranya">
      <AranyaNavbar market={market} heroMode={false} cartCount={cartCount} onCartClick={onCartClick} onAccountClick={onAccountClick} />
      <JournalHeader />
      {cat === "All" && <FeaturedPost post={featured} />}

      {/* filter + grid */}
      <section style={{ background: "var(--bg)", padding: "48px 0 96px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
          <div style={{ marginBottom: 44 }}><JournalChips value={cat} onChange={setCat} /></div>
          {grid.length === 0 ? (
            <div style={{ textAlign: "center", padding: "70px 0" }}>
              <h3 className="disp" style={{ fontSize: 28, color: "var(--ink)", margin: 0 }}>No posts in {cat} yet</h3>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--muted)", marginTop: 8 }}>More stories are on the way.</p>
            </div>
          ) : (
            <div className="jg-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
              {grid.map((p) => <PostCard key={p.slug} post={p} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { JournalPage });
