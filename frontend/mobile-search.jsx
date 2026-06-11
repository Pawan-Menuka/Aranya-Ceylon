/* Aranya Ceylon — MOBILE Search page (faithful port of search.jsx).
   Live search across CATALOG (products) + JOURNAL (articles), tabs, sort, highlight,
   idle (bestsellers) and empty states. Interactive.
   Depends on mobile-pages-common.jsx, catalog-data.js, journal-data.js, shared.jsx, home-common.jsx. */
const { useState: msUse, useMemo: msMemo, useRef: msRef } = React;

const MS_SUGGESTIONS = ["Cinnamon", "Cardamom", "Curry powder", "Black pepper", "Turmeric", "Whole spices", "Recipes"];
function msNorm(x) { return (x || "").toString().toLowerCase(); }
function msScoreProduct(p, tokens) {
  const hay = [p.name, p.latin, p.origin, p.category, p.form, (p.flavour || []).join(" ")].map(msNorm).join(" ");
  let s = 0;
  for (const t of tokens) { if (!hay.includes(t)) return 0; s += msNorm(p.name).includes(t) ? 3 : 1; }
  return s + (p.popularity || 0) / 100;
}
function msScorePost(p, tokens) {
  const hay = [p.title, p.dek, p.category, p.author].map(msNorm).join(" ");
  let s = 0;
  for (const t of tokens) { if (!hay.includes(t)) return 0; s += msNorm(p.title).includes(t) ? 3 : 1; }
  return s;
}
function MSHighlight({ text, tokens }) {
  if (!tokens.length) return text;
  const re = new RegExp("(" + tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "ig");
  return String(text).split(re).map((part, i) =>
    tokens.includes(part.toLowerCase())
      ? <mark key={i} style={{ background: "rgba(186,117,23,.2)", color: "inherit", borderRadius: 3, padding: "0 1px" }}>{part}</mark>
      : <React.Fragment key={i}>{part}</React.Fragment>);
}

/* journal result row */
function MPostResult({ post, tokens }) {
  return (
    <div style={{ display: "flex", gap: 13, alignItems: "center", padding: "12px 10px", borderRadius: 10 }}>
      <div style={{ width: 78, height: 58, flex: "0 0 auto", borderRadius: 8, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${post.accent}, ${post.accent}88)` }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: post.accent, marginBottom: 4 }}>{post.category} · Journal</div>
        <h4 className="disp" style={{ fontSize: 17, color: "var(--ink)", margin: 0, lineHeight: 1.12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}><MSHighlight text={post.title} tokens={tokens} /></h4>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}><path d="M9 6l6 6-6 6" /></svg>
    </div>
  );
}

function MobileSearch({ market = "intl" }) {
  const [query, setQuery] = msUse("cinnamon");
  const [tab, setTab] = msUse("all");
  const [sort, setSort] = msUse("relevance");
  const inputRef = msRef(null);
  const accent = market === "local" ? "var(--brand)" : "var(--accent)";

  const tokens = msMemo(() => msNorm(query).split(/\s+/).filter(Boolean), [query]);
  const products = msMemo(() => {
    if (!tokens.length) return [];
    let list = window.CATALOG.map((p) => [p, msScoreProduct(p, tokens)]).filter(([, s]) => s > 0);
    const num = (p) => parseFloat(p.usd.replace(/[^0-9.]/g, ""));
    const sorters = { relevance: (a, b) => b[1] - a[1], "price-asc": (a, b) => num(a[0]) - num(b[0]), "price-desc": (a, b) => num(b[0]) - num(a[0]), rating: (a, b) => b[0].rating - a[0].rating };
    return list.sort(sorters[sort] || sorters.relevance).map(([p]) => p);
  }, [tokens, sort]);
  const posts = msMemo(() => {
    if (!tokens.length) return [];
    return window.JOURNAL.map((p) => [p, msScorePost(p, tokens)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([p]) => p);
  }, [tokens]);

  const total = products.length + posts.length;
  const hasQuery = tokens.length > 0;
  const showProducts = (tab === "all" || tab === "products") && products.length > 0;
  const showPosts = (tab === "all" || tab === "journal") && posts.length > 0;
  const tabs = [["all", "All", total], ["products", "Spices", products.length], ["journal", "Journal", posts.length]];
  const best = window.CATALOG.filter((p) => p.badge === "Bestseller").slice(0, 4);

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)" }}>
      <MPageBar title="Search" onBack={() => {}} />

      {/* search header */}
      <header style={{ background: "var(--brand)", color: "#FDFAF5", position: "relative", overflow: "hidden", padding: "28px 18px 26px", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, opacity: .5, background: "radial-gradient(120% 90% at 88% -10%, rgba(29,158,117,.55) 0%, transparent 52%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <Eyebrow center light>Search</Eyebrow>
          <h1 className="disp" style={{ fontSize: 34, lineHeight: 1.02, margin: "10px 0 20px", fontWeight: 600 }}>Find your spice</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#FFFDF9", borderRadius: 999, padding: "6px 8px 6px 16px", boxShadow: "0 14px 34px rgba(0,0,0,.22)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search spices, recipes…"
              style={{ flex: 1, border: 0, outline: "none", background: "transparent", fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--ink)", minWidth: 0 }} />
            {query && (
              <button onClick={() => { setQuery(""); inputRef.current && inputRef.current.focus(); }} aria-label="Clear" style={{ background: "none", border: 0, cursor: "pointer", padding: 6, flex: "0 0 auto" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", marginTop: 16 }}>
            {MS_SUGGESTIONS.slice(0, 5).map((s) => (
              <button key={s} onClick={() => setQuery(s)} style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "#FDFAF5", background: "rgba(253,250,245,.1)", border: "1px solid rgba(253,250,245,.2)", borderRadius: 999, padding: "6px 12px", cursor: "pointer" }}>{s}</button>
            ))}
          </div>
        </div>
      </header>

      {/* results */}
      <section style={{ padding: "20px 18px 8px", minHeight: "40vh" }}>
        {!hasQuery ? (
          <div>
            <div style={{ marginBottom: 14 }}><Eyebrow>Bestsellers to start with</Eyebrow></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {best.map((p) => <MProductCard key={p.name} p={p} market={market} accent={accent} />)}
            </div>
          </div>
        ) : total === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0 10px" }}>
            <div style={{ width: 60, height: 60, borderRadius: 999, background: "var(--surface)", display: "grid", placeItems: "center", margin: "0 auto 18px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            </div>
            <h2 className="disp" style={{ fontSize: 26, color: "var(--ink)", margin: "0 0 8px", lineHeight: 1.1 }}>No matches for “{query}”</h2>
            <p className="prose" style={{ fontSize: 14.5, color: "var(--muted)", margin: "0 auto 20px", maxWidth: 280 }}>Try a broader term, or one of these:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {MS_SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => setQuery(s)} style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--brand)", border: "1px solid var(--line)", background: "#fff", borderRadius: 999, padding: "8px 14px", cursor: "pointer" }}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink)", margin: "0 0 12px" }}>
              <b>{total}</b> {total === 1 ? "result" : "results"} for <span className="disp" style={{ fontStyle: "italic", fontSize: 18, color: "var(--brand)" }}>“{query}”</span>
            </p>
            {/* tabs */}
            <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--line)", marginBottom: 18 }}>
              {tabs.map(([id, label, n]) => {
                const on = tab === id;
                return (
                  <button key={id} onClick={() => setTab(id)} disabled={n === 0} style={{ background: "none", border: 0, cursor: n === 0 ? "default" : "pointer", padding: "10px 13px", position: "relative",
                    fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, color: n === 0 ? "var(--line)" : on ? "var(--brand)" : "var(--muted)" }}>
                    {label} <span style={{ fontWeight: 600, opacity: .7 }}>{n}</span>
                    {on && <span style={{ position: "absolute", left: 10, right: 10, bottom: -1, height: 2, background: "var(--brand)", borderRadius: 2 }} />}
                  </button>
                );
              })}
            </div>
            {/* sort (products) */}
            {tab !== "journal" && products.length > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>
                  Sort
                  <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", background: "#fff" }}>
                    <option value="relevance">Relevance</option>
                    <option value="price-asc">Price ↑</option>
                    <option value="price-desc">Price ↓</option>
                    <option value="rating">Top-rated</option>
                  </select>
                </label>
              </div>
            )}
            {showProducts && (
              <div style={{ marginBottom: showPosts ? 28 : 0 }}>
                {tab === "all" && <div style={{ marginBottom: 12 }}><Eyebrow>Spices &amp; blends</Eyebrow></div>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {products.map((p) => <MProductCard key={p.name} p={p} market={market} accent={accent} />)}
                </div>
              </div>
            )}
            {showPosts && (
              <div>
                {tab === "all" && <div style={{ margin: "4px 0 6px" }}><Eyebrow>From the Journal</Eyebrow></div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {posts.map((p) => <MPostResult key={p.slug} post={p} tokens={tokens} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
      <div style={{ height: 30 }} />
      <MPageFooter market={market} />
    </div>
  );
}

Object.assign(window, { MobileSearch });
