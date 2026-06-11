/* Aranya Ceylon — Search results UI.
   Searches both CATALOG (products) and JOURNAL (articles) live.
   Depends on catalog-data.js (CATALOG), journal-data.js (JOURNAL),
   cards.jsx (CardCFinal), shared.jsx (Icon), home-common.jsx (Eyebrow),
   cart-ui.jsx, navbar.jsx. Exports SearchPage. */
const { useState: sUse, useMemo: sMemo, useRef: sRef, useEffect: sEffect } = React;

const SEARCH_SUGGESTIONS = ["Cinnamon", "Cardamom", "Curry powder", "Black pepper", "Turmeric", "Whole spices", "Recipes", "Sourcing"];

function sNorm(x) { return (x || "").toString().toLowerCase(); }

/* score a product/post against tokens; 0 = no match */
function scoreProduct(p, tokens) {
  const hay = [p.name, p.latin, p.origin, p.category, p.form, (p.flavour || []).join(" ")].map(sNorm).join(" ");
  let s = 0;
  for (const t of tokens) {
    if (!hay.includes(t)) return 0;
    if (sNorm(p.name).includes(t)) s += 3; else s += 1;
  }
  return s + (p.popularity || 0) / 100;
}
function scorePost(p, tokens) {
  const hay = [p.title, p.dek, p.category, p.author].map(sNorm).join(" ");
  let s = 0;
  for (const t of tokens) {
    if (!hay.includes(t)) return 0;
    if (sNorm(p.title).includes(t)) s += 3; else s += 1;
  }
  return s;
}

/* highlight matched substrings in a label */
function Highlight({ text, tokens }) {
  if (!tokens.length) return text;
  const re = new RegExp("(" + tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "ig");
  const parts = String(text).split(re);
  return parts.map((part, i) =>
    re.test(part) && tokens.includes(part.toLowerCase())
      ? <mark key={i} style={{ background: "rgba(186,117,23,.18)", color: "inherit", borderRadius: 3, padding: "0 1px" }}>{part}</mark>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );
}

/* compact journal result row */
function PostResult({ post, tokens }) {
  const [h, setH] = sUse(false);
  return (
    <a href={"Article.html?post=" + post.slug} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "flex", gap: 18, alignItems: "center", textDecoration: "none", padding: "16px 16px", borderRadius: 10,
        background: h ? "var(--surface)" : "transparent", transition: "background .15s" }}>
      <div style={{ width: 116, height: 80, flex: "0 0 auto", borderRadius: 8, overflow: "hidden", position: "relative" }}>
        <image-slot id={post.slot} shape="rect" fit="cover" placeholder=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}></image-slot>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(155deg, ${post.accent}33, ${post.accent}aa)`, mixBlendMode: "multiply", pointerEvents: "none" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: post.accent, marginBottom: 6 }}>{post.category} · Journal</div>
        <h4 className="disp" style={{ fontSize: 22, color: "var(--ink)", margin: "0 0 5px", lineHeight: 1.12 }}><Highlight text={post.title} tokens={tokens} /></h4>
        <p className="prose" style={{ fontSize: 14.5, color: "var(--muted)", margin: 0, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.dek}</p>
      </div>
      <span style={{ flex: "0 0 auto", transform: h ? "translateX(4px)" : "none", transition: "transform .2s" }}><Icon name="chevron" size={16} stroke="var(--muted)" /></span>
    </a>
  );
}

/* ---------- page ---------- */
function SearchPage({ market, cartCount, onCartClick, onAccountClick }) {
  const initial = new URLSearchParams(location.search).get("q") || "";
  const [query, setQuery] = sUse(initial);
  const [tab, setTab] = sUse("all");      // all | products | journal
  const [sort, setSort] = sUse("relevance");
  const inputRef = sRef(null);

  /* Live catalog — seed from bundled dummy data so search works instantly,
     then replace with API data when it resolves. */
  const [catalog, setCatalog] = sUse(window.CATALOG || []);
  sEffect(() => {
    let alive = true;
    if (window.AranyaAPI) {
      window.AranyaAPI.getAllProducts()
        .then((r) => {
          if (!alive || !r.items || !r.items.length) return;
          setCatalog(r.items);
        })
        .catch(() => {/* keep bundled fallback */});
    }
    return () => { alive = false; };
  }, []);

  sEffect(() => { if (inputRef.current && !initial) inputRef.current.focus(); }, []);

  const tokens = sMemo(() => sNorm(query).split(/\s+/).filter(Boolean), [query]);

  const products = sMemo(() => {
    if (!tokens.length) return [];
    let list = catalog.map((p) => [p, scoreProduct(p, tokens)]).filter(([, s]) => s > 0);
    const byRel = (a, b) => b[1] - a[1];
    const num = (p) => parseFloat(String(p.usd || "0").replace(/[^0-9.]/g, ""));
    const sorters = {
      relevance: byRel,
      "price-asc": (a, b) => num(a[0]) - num(b[0]),
      "price-desc": (a, b) => num(b[0]) - num(a[0]),
      rating: (a, b) => (b[0].rating || 0) - (a[0].rating || 0),
    };
    return list.sort(sorters[sort] || byRel).map(([p]) => p);
  }, [tokens, sort, catalog]);

  const posts = sMemo(() => {
    if (!tokens.length) return [];
    return window.JOURNAL.map((p) => [p, scorePost(p, tokens)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([p]) => p);
  }, [tokens]);

  const total = products.length + posts.length;
  const showProducts = (tab === "all" || tab === "products") && products.length > 0;
  const showPosts = (tab === "all" || tab === "journal") && posts.length > 0;
  const hasQuery = tokens.length > 0;

  const tabs = [["all", "All", total], ["products", "Spices", products.length], ["journal", "Journal", posts.length]];

  return (
    <div className="aranya">
      <AranyaNavbar market={market} heroMode={false} cartCount={cartCount} onCartClick={onCartClick} onAccountClick={onAccountClick} />

      {/* search header */}
      <header style={{ background: "var(--brand)", color: "#FDFAF5", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: .5, background: "radial-gradient(120% 90% at 88% -10%, rgba(29,158,117,.55) 0%, transparent 52%)" }} />
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "132px 40px 48px", position: "relative", textAlign: "center" }}>
          <Eyebrow center light>Search</Eyebrow>
          <h1 className="disp" style={{ fontSize: "clamp(36px,4.6vw,58px)", lineHeight: 1.02, margin: "14px 0 26px", fontWeight: 600 }}>
            Find your spice
          </h1>
          {/* input */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#FFFDF9", borderRadius: 999, padding: "7px 16px 7px 22px", boxShadow: "0 18px 44px rgba(0,0,0,.22)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search spices, blends, recipes…"
              style={{ flex: 1, border: 0, outline: "none", background: "transparent", fontFamily: "var(--font-ui)", fontSize: 17, color: "var(--ink)", minWidth: 0 }} />
            {query && (
              <button onClick={() => { setQuery(""); inputRef.current && inputRef.current.focus(); }} aria-label="Clear" style={{ background: "none", border: 0, cursor: "pointer", padding: 6, flex: "0 0 auto" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            )}
            <button className={market === "local" ? "btn btn-local" : "btn btn-intl"} style={{ width: "auto", padding: "12px 26px", flex: "0 0 auto" }} onClick={() => inputRef.current && inputRef.current.focus()}>Search</button>
          </div>
          {/* suggestion chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 20 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "rgba(253,250,245,.6)", fontWeight: 600, alignSelf: "center" }}>Popular:</span>
            {SEARCH_SUGGESTIONS.slice(0, 6).map((s) => (
              <button key={s} onClick={() => setQuery(s)} style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "#FDFAF5",
                background: "rgba(253,250,245,.1)", border: "1px solid rgba(253,250,245,.2)", borderRadius: 999, padding: "6px 13px", cursor: "pointer" }}>{s}</button>
            ))}
          </div>
        </div>
      </header>

      {/* results body */}
      <section style={{ background: "var(--bg)", padding: "36px 0 96px", minHeight: "50vh" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>

          {!hasQuery ? (
            <SearchIdle market={market} onPick={setQuery} catalog={catalog} />
          ) : total === 0 ? (
            <SearchEmpty query={query} market={market} onPick={setQuery} catalog={catalog} />
          ) : (
            <React.Fragment>
              {/* count + tabs + sort */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 8 }}>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--ink)", margin: 0 }}>
                  <b>{total}</b> {total === 1 ? "result" : "results"} for <span className="disp" style={{ fontStyle: "italic", fontSize: 20, color: "var(--brand)" }}>“{query}”</span>
                </p>
                {tab !== "journal" && products.length > 0 && (
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
                    Sort
                    <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 12px", background: "#fff", cursor: "pointer" }}>
                      <option value="relevance">Relevance</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="rating">Top-rated</option>
                    </select>
                  </label>
                )}
              </div>

              {/* tabs */}
              <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--line)", marginBottom: 34 }}>
                {tabs.map(([id, label, n]) => {
                  const on = tab === id;
                  return (
                    <button key={id} onClick={() => setTab(id)} disabled={n === 0} style={{
                      background: "none", border: 0, cursor: n === 0 ? "default" : "pointer", padding: "12px 16px", position: "relative",
                      fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: n === 0 ? "var(--line)" : on ? "var(--brand)" : "var(--muted)" }}>
                      {label} <span style={{ fontWeight: 600, opacity: .7 }}>{n}</span>
                      {on && <span style={{ position: "absolute", left: 12, right: 12, bottom: -1, height: 2, background: "var(--brand)", borderRadius: 2 }} />}
                    </button>
                  );
                })}
              </div>

              {/* products */}
              {showProducts && (
                <div style={{ marginBottom: showPosts ? 64 : 0 }}>
                  {tab === "all" && <Eyebrow>Spices &amp; blends</Eyebrow>}
                  <div className="sr-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22, marginTop: tab === "all" ? 22 : 0 }}>
                    {products.map((p) => <CardCFinal key={p.name} spice={p} market={market} />)}
                  </div>
                </div>
              )}

              {/* journal */}
              {showPosts && (
                <div>
                  {tab === "all" && <Eyebrow>From the Journal</Eyebrow>}
                  <div style={{ marginTop: tab === "all" ? 14 : 0, display: "flex", flexDirection: "column", gap: 4, maxWidth: 920 }}>
                    {posts.map((p) => <PostResult key={p.slug} post={p} tokens={tokens} />)}
                  </div>
                </div>
              )}
            </React.Fragment>
          )}
        </div>
      </section>
    </div>
  );
}

/* idle (no query) — popular searches + bestsellers */
function SearchIdle({ market, onPick, catalog }) {
  const cat = catalog || window.CATALOG || [];
  const best = cat.filter((p) => (p.badge === "Bestseller") || (p.certifications && p.certifications.includes("BESTSELLER"))).slice(0, 4);
  return (
    <div>
      <div style={{ textAlign: "center", maxWidth: 560, margin: "10px auto 48px" }}>
        <p className="prose" style={{ fontSize: 16.5, color: "var(--muted)", margin: 0 }}>Start typing to search the full harvest — whole spices, ground powders, estate blends and stories from the hill country.</p>
      </div>
      <div style={{ marginBottom: 14 }}><Eyebrow>Bestsellers to start with</Eyebrow></div>
      <div className="sr-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
        {best.map((p) => <CardCFinal key={p.name} spice={p} market={market} />)}
      </div>
    </div>
  );
}

/* empty (query, no results) */
function SearchEmpty({ query, market, onPick, catalog }) {
  const cat = catalog || window.CATALOG || [];
  const best = cat.filter((p) => (p.badge === "Bestseller") || (p.certifications && p.certifications.includes("BESTSELLER"))).slice(0, 4);
  return (
    <div>
      <div style={{ textAlign: "center", padding: "40px 0 56px", maxWidth: 560, margin: "0 auto" }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, background: "var(--surface)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
        </div>
        <h2 className="disp" style={{ fontSize: 34, color: "var(--ink)", margin: "0 0 10px", lineHeight: 1.1 }}>No matches for “{query}”</h2>
        <p className="prose" style={{ fontSize: 16, color: "var(--muted)", margin: "0 0 22px" }}>Check the spelling, or try a broader term. Here are a few popular searches:</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center" }}>
          {SEARCH_SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => onPick(s)} style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, color: "var(--brand)",
              border: "1px solid var(--line)", background: "#fff", borderRadius: 999, padding: "9px 16px", cursor: "pointer" }}>{s}</button>
          ))}
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 40 }}>
        <div style={{ marginBottom: 14 }}><Eyebrow>You might like</Eyebrow></div>
        <div className="sr-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
          {best.map((p) => <CardCFinal key={p.name} spice={p} market={market} />)}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SearchPage });
