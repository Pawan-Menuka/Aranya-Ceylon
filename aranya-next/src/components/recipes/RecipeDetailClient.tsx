"use client";

import * as React from "react";
import Link from "next/link";
import type { CatalogSpice } from "@/lib/types";
import type { Recipe } from "@/lib/recipes-data";
import { recipeTotal, fmtMinsLong, recipeServes } from "@/lib/recipes-data";
import { Reveal } from "../primitives/Reveal";
import { Liyawel, Eyebrow } from "../primitives/Motif";
import { SpicePhoto } from "../primitives/SpicePhoto";
import { ImageSlot } from "../primitives/ImageSlot";
import { useMarket } from "../MarketContext";
import { useCart } from "../CartContext";

// Recipe detail (ported from recipe-detail.jsx). Dark hero · meta band · sticky
// checkable ingredients · numbered method + cook's notes · shop-the-spices
// (wired to the live cart) · related.

function RDIcon({ name, size = 18, stroke = "currentColor", w = 1.7 }: { name: string; size?: number; stroke?: string; w?: number }) {
  const p: Record<string, React.ReactNode> = {
    clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
    prep: (<><path d="M5 3v8a2 2 0 0 0 4 0V3M7 11v10" /><path d="M17 3c-1.7 0-3 2-3 5s1.3 4 3 4m0 0v9m0-9c1.7 0 3-1 3-4s-1.3-5-3-5z" /></>),
    flame: <path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1.5.6-2.4 1.3-3.2C10 9 11.5 7 12 3z" />,
    users: (<><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.4 2.9-5.5 6.5-5.5S15.5 16.6 15.5 20" /><path d="M16 5.2A3 3 0 0 1 16 11M16.5 14.6c2.6.5 4.5 2.3 4.5 5" /></>),
    gauge: (<><path d="M3.5 16a9 9 0 1 1 17 0" /><path d="M12 16l4-4" /><circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none" /></>),
    printer: (<><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z" /></>),
    check: <path d="M5 12l5 5L20 6" />,
    plus: (<><path d="M12 5v14M5 12h14" /></>),
    leaf: <path d="M11 21C5 18 4 9 20 4c1 9-3 16-12 14-2-4 1-9 7-11" />,
    bulb: (<><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3z" /></>),
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>{p[name]}</svg>;
}

function MetaBand({ recipe }: { recipe: Recipe }) {
  const stats: [string, string, string][] = [
    ["prep", "Prep", fmtMinsLong(recipe.time.prep)],
    ["flame", "Cook", fmtMinsLong(recipe.time.cook)],
    ["clock", "Total", fmtMinsLong(recipeTotal(recipe))],
    ["users", "Yield", recipeServes(recipe).replace("Serves ", "")],
    ["gauge", "Level", recipe.difficulty],
  ];
  return (
    <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
      <div className="home-section-pad rd-meta" style={{ maxWidth: 1080, margin: "0 auto", padding: "0 40px" }}>
        {stats.map((s, i) => (
          <div key={s[1]} style={{ flex: "1 1 0", display: "flex", alignItems: "center", gap: 12, justifyContent: "center", padding: "20px 14px", borderLeft: i ? "1px solid var(--line)" : "none" }}>
            <RDIcon name={s[0]} size={22} stroke="var(--brand)" />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)" }}>{s[1]}</div>
              <div className="disp" style={{ fontSize: 21, color: "var(--ink)", fontWeight: 600, whiteSpace: "nowrap" }}>{s[2]}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Ingredients({ recipe }: { recipe: Recipe }) {
  const [checked, setChecked] = React.useState<Record<string, boolean>>({});
  const toggle = (k: string) => setChecked((c) => ({ ...c, [k]: !c[k] }));
  return (
    <aside className="rd-ingredients" style={{ position: "sticky", top: 122, alignSelf: "start" }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "26px 26px 22px" }}>
        <h2 className="disp" style={{ fontSize: 26, color: "var(--brand)", margin: "0 0 4px", lineHeight: 1.1 }}>Ingredients</h2>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", marginBottom: 18 }}>{recipeServes(recipe)}</div>
        {recipe.ingredients.map((grp, gi) => (
          <div key={gi} style={{ marginBottom: gi < recipe.ingredients.length - 1 ? 20 : 0 }}>
            {grp.group && <div className="eyebrow" style={{ color: recipe.accent, marginBottom: 12 }}>{grp.group}</div>}
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              {grp.items.map((it, ii) => {
                const k = gi + "-" + ii, on = checked[k];
                return (
                  <li key={k}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "7px 0", cursor: "pointer" }}>
                      <span onClick={() => toggle(k)} style={{ width: 19, height: 19, flex: "0 0 auto", marginTop: 1, borderRadius: 6, border: on ? "none" : "1.5px solid var(--gold-line)", background: on ? "var(--brand)" : "#fff", display: "grid", placeItems: "center", transition: "background .15s" }}>
                        {on && <RDIcon name="check" size={13} stroke="#fff" w={2.6} />}
                      </span>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, color: on ? "var(--muted)" : "var(--ink)", lineHeight: 1.45, textDecoration: on ? "line-through" : "none", transition: "color .15s" }}>{it}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}

function Method({ recipe }: { recipe: Recipe }) {
  return (
    <div>
      <h2 className="disp" style={{ fontSize: "clamp(28px,3vw,38px)", color: "var(--brand)", margin: "0 0 28px", lineHeight: 1.1 }}>Method</h2>
      <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {recipe.method.map((s, i) => (
          <Reveal key={i} as="li" style={{ display: "flex", gap: 20, paddingBottom: 28, marginBottom: 28, borderBottom: i < recipe.method.length - 1 ? "1px solid var(--line)" : "none" }}>
            <span className="disp" style={{ flex: "0 0 auto", width: 46, height: 46, borderRadius: 999, display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--gold-line)", color: recipe.accent, fontSize: 22, fontWeight: 600 }}>{i + 1}</span>
            <p className="prose" style={{ fontSize: 17.5, color: "var(--ink)", margin: 0, lineHeight: 1.62, paddingTop: 8 }}>{s}</p>
          </Reveal>
        ))}
      </ol>
      {recipe.tips && recipe.tips.length > 0 && (
        <Reveal>
          <div style={{ background: "#1A1A1A", color: "#FDFAF5", borderRadius: 16, padding: "28px 30px", marginTop: 8, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 120% at 100% 0%, rgba(15,110,86,.26), transparent 55%)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <RDIcon name="bulb" size={20} stroke="#E6B860" />
                <span className="eyebrow" style={{ color: "#E6B860" }}>Cook&rsquo;s notes</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 13 }}>
                {recipe.tips.map((t, i) => (
                  <li key={i} style={{ display: "flex", gap: 12, fontFamily: "var(--font-ui)", fontSize: 14.5, color: "rgba(253,250,245,.85)", lineHeight: 1.55 }}>
                    <span style={{ flex: "0 0 auto", marginTop: 2 }}><RDIcon name="leaf" size={16} stroke="#9FE3C4" /></span>{t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
}

function SpiceRow({ p, market, accentBtn }: { p: CatalogSpice; market: "intl" | "local"; accentBtn: string }) {
  const cart = useCart();
  const [added, setAdded] = React.useState(false);
  const onAdd = () => {
    cart.add(p, "100g", p.form || "Whole", 1);
    cart.openCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13, background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ width: 46, height: 46, borderRadius: 8, flex: "0 0 auto", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.05)" }}>
        <SpicePhoto spice={p} ratio="1 / 1" label={false} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="disp" style={{ fontSize: 17, color: "var(--ink)", lineHeight: 1.12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>{market === "local" ? p.lkr : p.usd} · 100g</div>
      </div>
      <button onClick={onAdd} aria-label={"Add " + p.name} style={{ flex: "0 0 auto", width: 36, height: 36, borderRadius: 9, border: `1.5px solid ${accentBtn}`, background: added ? accentBtn : "transparent", color: added ? "#fff" : accentBtn, cursor: "pointer", display: "grid", placeItems: "center", transition: "background .15s, color .15s" }}>
        <RDIcon name={added ? "check" : "plus"} size={18} stroke={added ? "#fff" : accentBtn} w={2.2} />
      </button>
    </div>
  );
}

function SpiceShop({ recipe, items }: { recipe: Recipe; items: CatalogSpice[] }) {
  const { market } = useMarket();
  const cart = useCart();
  if (!items.length) return null;
  const accentBtn = market === "local" ? "var(--brand)" : "var(--accent)";
  const addAll = () => {
    items.forEach((p) => cart.add(p, "100g", p.form || "Whole", 1));
    cart.openCart();
  };
  return (
    <section style={{ background: "var(--bg)", padding: "20px 0 96px" }}>
      <div className="home-section-pad" style={{ maxWidth: 1080, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, padding: "clamp(26px,3vw,40px)" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 24 }}>
            <div>
              <Eyebrow>Cook it with ours</Eyebrow>
              <h2 className="disp" style={{ fontSize: "clamp(26px,2.8vw,38px)", color: "var(--brand)", margin: "12px 0 0", lineHeight: 1.06 }}>Spices in this recipe</h2>
            </div>
            <button onClick={addAll} className={market === "local" ? "btn btn-local" : "btn btn-intl"} style={{ width: "auto", padding: "13px 24px" }}>Add all to basket</button>
          </div>
          <div className="rd-spices">
            {items.map((p) => <SpiceRow key={p.name} p={p} market={market} accentBtn={accentBtn} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function RelatedRecipes({ related }: { related: Recipe[] }) {
  if (!related.length) return null;
  return (
    <section style={{ background: "var(--surface)", padding: "84px 0", borderTop: "1px solid var(--line)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px" }}>
        <Reveal><Eyebrow>Keep cooking</Eyebrow></Reveal>
        <Reveal delay={60}><h2 className="disp" style={{ fontSize: 34, color: "var(--brand)", margin: "14px 0 36px", lineHeight: 1.05 }}>More from the kitchen</h2></Reveal>
        <div className="ar-rel">
          {related.map((r) => (
            <Link key={r.slug} href={"/recipes/" + r.slug} style={{ textDecoration: "none" }}>
              <div style={{ position: "relative", borderRadius: 9, overflow: "hidden", aspectRatio: "3 / 2" }}>
                <ImageSlot id={r.slot} shape="rect" fit="cover" placeholder={`Drop a photo of ${r.title}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(155deg, ${r.accent}33, ${r.accent}aa)`, mixBlendMode: "multiply", pointerEvents: "none" }} />
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: r.accent, margin: "16px 0 8px" }}>{r.course}</div>
              <h3 className="disp" style={{ fontSize: 22, color: "var(--ink)", margin: 0, lineHeight: 1.15 }}>{r.title}</h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RecipeDetailClient({ recipe, related, shopSpices }: { recipe: Recipe; related: Recipe[]; shopSpices: CatalogSpice[] }) {
  return (
    <div data-screen-label="Recipe detail">
      <header data-hero style={{ position: "relative", minHeight: "74vh", background: "#161412", color: "#FDFAF5", overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
        <ImageSlot id={recipe.slot} shape="rect" fit="cover" placeholder={`Drop the hero photo of ${recipe.title}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${recipe.accent}40, rgba(11,16,13,.62))`, mixBlendMode: "multiply", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,8,6,.5) 0%, transparent 30%, transparent 46%, rgba(10,8,6,.86) 100%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 880, margin: "0 auto", padding: "0 40px 70px", width: "100%", textAlign: "center" }}>
          <Link href="/recipes" style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#E6B860", display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <span style={{ width: 18, height: 1.5, background: "#E6B860" }} />{recipe.course}
          </Link>
          <h1 className="disp" style={{ fontSize: "clamp(34px,5vw,68px)", lineHeight: 1.04, margin: "0 0 20px", fontWeight: 600, letterSpacing: ".005em" }}>{recipe.title}</h1>
          <p className="prose" style={{ fontSize: "clamp(16px,1.6vw,20px)", color: "rgba(253,250,245,.85)", margin: "0 auto", maxWidth: 600 }}>{recipe.dek}</p>
        </div>
      </header>

      <MetaBand recipe={recipe} />

      <section style={{ background: "var(--bg)", padding: "64px 0 40px" }}>
        <div className="home-section-pad" style={{ maxWidth: 1080, margin: "0 auto", padding: "0 40px" }}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 8 }}>
              <p className="prose" style={{ fontSize: "clamp(18px,2vw,22px)", color: "var(--ink)", lineHeight: 1.6, margin: 0, maxWidth: 720, fontStyle: "italic", fontWeight: 500 }}>{recipe.intro}</p>
            </div>
          </Reveal>
          <Liyawel width={170} style={{ margin: "34px 0 44px", justifyContent: "flex-start" }} />
          <div className="rd-body">
            <Ingredients recipe={recipe} />
            <Method recipe={recipe} />
          </div>
        </div>
      </section>

      <SpiceShop recipe={recipe} items={shopSpices} />
      <RelatedRecipes related={related} />
    </div>
  );
}
