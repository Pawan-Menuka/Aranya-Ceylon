"use client";

import * as React from "react";
import Link from "next/link";
import type { CatalogSpice } from "@/lib/types";
import type { Post } from "@/lib/journal-data";
import { Eyebrow } from "../primitives/Motif";
import { Icon } from "../primitives/Icon";
import { ImageSlot } from "../primitives/ImageSlot";
import { CardCFinal } from "../cards/Cards";
import { useMarket } from "../MarketContext";
import { listProducts } from "@/lib/api/products";
import { toCatalogSpice } from "@/lib/catalog-data";

// Search results (ported from search.jsx). Searches both the catalog (products)
// and the journal (articles). Query is seeded from ?q= and kept in the URL.

const SEARCH_SUGGESTIONS = ["Cinnamon", "Cardamom", "Curry powder", "Black pepper", "Turmeric", "Whole spices", "Recipes", "Sourcing"];

function norm(x: unknown): string {
  return (x ?? "").toString().toLowerCase();
}

function scoreProduct(p: CatalogSpice, tokens: string[]): number {
  const hay = [p.name, p.latin, p.origin, p.category, p.form, (p.flavour || []).join(" ")].map(norm).join(" ");
  let s = 0;
  for (const t of tokens) {
    if (!hay.includes(t)) return 0;
    if (norm(p.name).includes(t)) s += 3;
    else s += 1;
  }
  return s + (p.popularity || 0) / 100;
}
function scorePost(p: Post, tokens: string[]): number {
  const hay = [p.title, p.dek, p.category, p.author].map(norm).join(" ");
  let s = 0;
  for (const t of tokens) {
    if (!hay.includes(t)) return 0;
    if (norm(p.title).includes(t)) s += 3;
    else s += 1;
  }
  return s;
}

function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  if (!tokens.length) return <>{text}</>;
  const re = new RegExp("(" + tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "ig");
  const parts = String(text).split(re);
  return (
    <>
      {parts.map((part, i) =>
        tokens.includes(part.toLowerCase()) ? (
          <mark key={i} style={{ background: "rgba(186,117,23,.18)", color: "inherit", borderRadius: 3, padding: "0 1px" }}>{part}</mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

function PostResult({ post, tokens }: { post: Post; tokens: string[] }) {
  const [h, setH] = React.useState(false);
  return (
    <Link href={"/journal/" + post.slug} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ display: "flex", gap: 18, alignItems: "center", textDecoration: "none", padding: "16px 16px", borderRadius: 10, background: h ? "var(--surface)" : "transparent", transition: "background .15s" }}>
      <div style={{ width: 116, height: 80, flex: "0 0 auto", borderRadius: 8, overflow: "hidden", position: "relative" }}>
        <ImageSlot id={post.slot} shape="rect" fit="cover" placeholder="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(155deg, ${post.accent}33, ${post.accent}aa)`, mixBlendMode: "multiply", pointerEvents: "none" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: post.accent, marginBottom: 6 }}>{post.category} · Journal</div>
        <h4 className="disp" style={{ fontSize: 22, color: "var(--ink)", margin: "0 0 5px", lineHeight: 1.12 }}><Highlight text={post.title} tokens={tokens} /></h4>
        <p className="prose" style={{ fontSize: 14.5, color: "var(--muted)", margin: 0, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.dek}</p>
      </div>
      <span style={{ flex: "0 0 auto", transform: h ? "translateX(4px)" : "none", transition: "transform .2s" }}><Icon name="chevron" size={16} stroke="var(--muted)" /></span>
    </Link>
  );
}

function SearchIdle({ best }: { best: CatalogSpice[] }) {
  const { market } = useMarket();
  return (
    <div>
      <div style={{ textAlign: "center", maxWidth: 560, margin: "10px auto 48px" }}>
        <p className="prose" style={{ fontSize: 16.5, color: "var(--muted)", margin: 0 }}>Start typing to search the full harvest — whole spices, ground powders, estate blends and stories from the hill country.</p>
      </div>
      <div style={{ marginBottom: 14 }}><Eyebrow>Bestsellers to start with</Eyebrow></div>
      <div className="sr-grid">{best.map((p) => <CardCFinal key={p.name} spice={p} market={market} />)}</div>
    </div>
  );
}

function SearchEmpty({ query, best, onPick }: { query: string; best: CatalogSpice[]; onPick: (s: string) => void }) {
  const { market } = useMarket();
  return (
    <div>
      <div style={{ textAlign: "center", padding: "40px 0 56px", maxWidth: 560, margin: "0 auto" }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, background: "var(--surface)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
        </div>
        <h2 className="disp" style={{ fontSize: 34, color: "var(--ink)", margin: "0 0 10px", lineHeight: 1.1 }}>No matches for &ldquo;{query}&rdquo;</h2>
        <p className="prose" style={{ fontSize: 16, color: "var(--muted)", margin: "0 0 22px" }}>Check the spelling, or try a broader term. Here are a few popular searches:</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center" }}>
          {SEARCH_SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => onPick(s)} style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, color: "var(--brand)", border: "1px solid var(--line)", background: "#fff", borderRadius: 999, padding: "9px 16px", cursor: "pointer" }}>{s}</button>
          ))}
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 40 }}>
        <div style={{ marginBottom: 14 }}><Eyebrow>You might like</Eyebrow></div>
        <div className="sr-grid">{best.map((p) => <CardCFinal key={p.name} spice={p} market={market} />)}</div>
      </div>
    </div>
  );
}

export function SearchClient({ products, journal, initialQuery = "" }: { products: CatalogSpice[]; journal: Post[]; initialQuery?: string }) {
  const { market } = useMarket();
  const [query, setQuery] = React.useState(initialQuery);
  const [tab, setTab] = React.useState<"all" | "products" | "journal">("all");
  const [sort, setSort] = React.useState("relevance");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (inputRef.current && !initialQuery) inputRef.current.focus();
  }, [initialQuery]);

  const tokens = React.useMemo(() => norm(query).split(/\s+/).filter(Boolean), [query]);

  // Keep the query in the URL (shareable search) without a navigation.
  React.useEffect(() => {
    const q = query.trim();
    window.history.replaceState(null, "", q ? `?q=${encodeURIComponent(q)}` : window.location.pathname);
  }, [query]);

  // Authoritative product results from the backend full-text-search endpoint
  // (ranked, market-filtered, covers the whole catalogue — not just the ≤100
  // preloaded products the client scores). Debounced; falls back to null (→
  // client-side scoring) on error / offline so search still works with the API
  // down (BUG-12). `null` = no backend result yet, `[]` = backend found nothing.
  const [remoteProducts, setRemoteProducts] = React.useState<CatalogSpice[] | null>(null);
  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setRemoteProducts(null); return; }
    let alive = true;
    const t = setTimeout(() => {
      listProducts({ search: q, limit: 24 })
        .then((res) => { if (alive) setRemoteProducts((res.items || []).map(toCatalogSpice)); })
        .catch(() => { if (alive) setRemoteProducts(null); });
    }, 220);
    return () => { alive = false; clearTimeout(t); };
  }, [query]);

  const productResults = React.useMemo(() => {
    if (!tokens.length) return [];
    // Sort by the price the shopper is actually seeing, not always USD
    // (remaining-surfaces audit #9).
    const num = (p: CatalogSpice) => parseFloat((market === "local" ? p.lkr : p.usd).replace(/[^0-9.]/g, "")) || 0;
    const applySort = (list: CatalogSpice[]): CatalogSpice[] => {
      if (sort === "price-asc") return [...list].sort((a, b) => num(a) - num(b));
      if (sort === "price-desc") return [...list].sort((a, b) => num(b) - num(a));
      if (sort === "rating") return [...list].sort((a, b) => b.rating - a.rating);
      return list; // relevance — keep the incoming (backend ts_rank / client score) order
    };
    // Prefer backend FTS ranking when it has hits. Fall back to client-side
    // scoring while the request is in flight, when offline, OR when FTS (which is
    // word-based) returns nothing but a partial/substring match exists locally.
    if (remoteProducts && remoteProducts.length) return applySort(remoteProducts);
    const scored = products
      .map((p) => [p, scoreProduct(p, tokens)] as [CatalogSpice, number])
      .filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([p]) => p);
    return applySort(scored);
  }, [remoteProducts, products, tokens, sort, market]);

  const postResults = React.useMemo(() => {
    if (!tokens.length) return [];
    return journal.map((p) => [p, scorePost(p, tokens)] as [Post, number]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([p]) => p);
  }, [journal, tokens]);

  const total = productResults.length + postResults.length;
  const showProducts = (tab === "all" || tab === "products") && productResults.length > 0;
  const showPosts = (tab === "all" || tab === "journal") && postResults.length > 0;
  const hasQuery = tokens.length > 0;
  const best = React.useMemo(() => products.filter((p) => p.badge === "Bestseller").slice(0, 4), [products]);

  const tabs: [typeof tab, string, number][] = [["all", "All", total], ["products", "Spices", productResults.length], ["journal", "Journal", postResults.length]];

  return (
    <div data-screen-label="Search">
      <header style={{ background: "var(--brand)", color: "#FDFAF5", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.5, background: "radial-gradient(120% 90% at 88% -10%, rgba(29,158,117,.55) 0%, transparent 52%)" }} />
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "132px 40px 48px", position: "relative", textAlign: "center" }}>
          <Eyebrow center light>Search</Eyebrow>
          <h1 className="disp" style={{ fontSize: "clamp(36px,4.6vw,58px)", lineHeight: 1.02, margin: "14px 0 26px", fontWeight: 600 }}>Find your spice</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#FFFDF9", borderRadius: 999, padding: "7px 16px 7px 22px", boxShadow: "0 18px 44px rgba(0,0,0,.22)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search spices, blends, recipes…" style={{ flex: 1, border: 0, outline: "none", background: "transparent", fontFamily: "var(--font-ui)", fontSize: 17, color: "var(--ink)", minWidth: 0 }} />
            {query && (
              <button onClick={() => { setQuery(""); inputRef.current?.focus(); }} aria-label="Clear" style={{ background: "none", border: 0, cursor: "pointer", padding: 6, flex: "0 0 auto" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            )}
            <button className={market === "local" ? "btn btn-local" : "btn btn-intl"} style={{ width: "auto", padding: "12px 26px", flex: "0 0 auto" }} onClick={() => inputRef.current?.focus()}>Search</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 20 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "rgba(253,250,245,.6)", fontWeight: 600, alignSelf: "center" }}>Popular:</span>
            {SEARCH_SUGGESTIONS.slice(0, 6).map((s) => (
              <button key={s} onClick={() => setQuery(s)} style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "#FDFAF5", background: "rgba(253,250,245,.1)", border: "1px solid rgba(253,250,245,.2)", borderRadius: 999, padding: "6px 13px", cursor: "pointer" }}>{s}</button>
            ))}
          </div>
        </div>
      </header>

      <section style={{ background: "var(--bg)", padding: "36px 0 96px", minHeight: "50vh" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
          {!hasQuery ? (
            <SearchIdle best={best} />
          ) : total === 0 ? (
            <SearchEmpty query={query} best={best} onPick={setQuery} />
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 8 }}>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--ink)", margin: 0 }}>
                  <b>{total}</b> {total === 1 ? "result" : "results"} for <span className="disp" style={{ fontStyle: "italic", fontSize: 20, color: "var(--brand)" }}>&ldquo;{query}&rdquo;</span>
                </p>
                {tab !== "journal" && productResults.length > 0 && (
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

              <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--line)", marginBottom: 34 }}>
                {tabs.map(([id, label, n]) => {
                  const on = tab === id;
                  return (
                    <button key={id} onClick={() => setTab(id)} disabled={n === 0} style={{ background: "none", border: 0, cursor: n === 0 ? "default" : "pointer", padding: "12px 16px", position: "relative", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: n === 0 ? "var(--line)" : on ? "var(--brand)" : "var(--muted)" }}>
                      {label} <span style={{ fontWeight: 600, opacity: 0.7 }}>{n}</span>
                      {on && <span style={{ position: "absolute", left: 12, right: 12, bottom: -1, height: 2, background: "var(--brand)", borderRadius: 2 }} />}
                    </button>
                  );
                })}
              </div>

              {showProducts && (
                <div style={{ marginBottom: showPosts ? 64 : 0 }}>
                  {tab === "all" && <Eyebrow>Spices &amp; blends</Eyebrow>}
                  <div className="sr-grid" style={{ marginTop: tab === "all" ? 22 : 0 }}>
                    {productResults.map((p) => <CardCFinal key={p.name} spice={p} market={market} />)}
                  </div>
                </div>
              )}

              {showPosts && (
                <div>
                  {tab === "all" && <Eyebrow>From the Journal</Eyebrow>}
                  <div style={{ marginTop: tab === "all" ? 14 : 0, display: "flex", flexDirection: "column", gap: 4, maxWidth: 920 }}>
                    {postResults.map((p) => <PostResult key={p.slug} post={p} tokens={tokens} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
