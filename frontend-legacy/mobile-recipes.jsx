/* Aranya Ceylon — MOBILE Recipes hub + Recipe Detail (ports of recipes.jsx + recipe-detail.jsx).
   Recipes: forest header, featured, course chips, recipe cards.
   Detail: dark hero, meta band, intro, checkable ingredients, numbered method, cook's notes,
   shop-the-spices. Internal list<->detail nav. Standalone <MobileRecipeDetail> for the showcase.
   Depends on mobile-pages-common.jsx, recipes-data.js (RECIPES, RECIPE_COURSES), catalog-data.js,
   home-common.jsx, shared.jsx (SpicePhoto). */
const { useState: mrUse, useMemo: mrMemo } = React;

function mrTotal(r) { return (r.time.prep || 0) + (r.time.cook || 0); }
function mrFmt(m) { if (m < 60) return m + " min"; const h = Math.floor(m / 60), mm = m % 60; return h + " hr" + (mm ? " " + mm : ""); }
function mrServes(r) { return r.serves > 0 ? "Serves " + r.serves : "Makes 1 jar"; }
function mrCat(name) { return (window.CATALOG || []).find((p) => p.name === name); }

function MRIcon({ name, size = 15, stroke = "currentColor", w = 1.7 }) {
  const p = {
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    users: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.4 2.9-5.5 6.5-5.5S15.5 16.6 15.5 20" /><path d="M16 5.2A3 3 0 0 1 16 11M16.5 14.6c2.6.5 4.5 2.3 4.5 5" /></>,
    gauge: <><path d="M3.5 16a9 9 0 1 1 17 0" /><path d="M12 16l4-4" /><circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none" /></>,
    flame: <><path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1.5.6-2.4 1.3-3.2C10 9 11.5 7 12 3z" /></>,
    prep: <><path d="M5 3v8a2 2 0 0 0 4 0V3M7 11v10" /><path d="M17 3c-1.7 0-3 2-3 5s1.3 4 3 4m0 0v9m0-9c1.7 0 3-1 3-4s-1.3-5-3-5z" /></>,
    check: <path d="M5 12l5 5L20 6" />,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    leaf: <><path d="M11 21C5 18 4 9 20 4c1 9-3 16-12 14-2-4 1-9 7-11" /></>,
    bulb: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3z" /></>,
  }[name];
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>{p}</svg>;
}

function MRecipeImage({ recipe, ratio = "3 / 2", radius = 9 }) {
  return (
    <div style={{ position: "relative", borderRadius: radius, overflow: "hidden", aspectRatio: ratio }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${recipe.accent}, ${recipe.accent}99)` }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 60% at 70% 20%, rgba(255,255,255,.12), transparent 60%)" }} />
    </div>
  );
}
function MCourseTag({ children, accent }) {
  return <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: accent, display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 1.5, background: accent }} />{children}</span>;
}
function MRMeta({ recipe, color = "var(--muted)" }) {
  const items = [["clock", mrFmt(mrTotal(recipe))], ["users", mrServes(recipe)], ["gauge", recipe.difficulty]];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
      {items.map(([ic, t]) => <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-ui)", fontSize: 12, color, fontWeight: 600 }}><MRIcon name={ic} size={14} stroke={color} />{t}</span>)}
    </div>
  );
}

/* ingredients with checkboxes */
function MIngredients({ recipe }) {
  const [checked, setChecked] = mrUse({});
  const toggle = (k) => setChecked((c) => ({ ...c, [k]: !c[k] }));
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "20px 20px 16px" }}>
      <h2 className="disp" style={{ fontSize: 24, color: "var(--brand)", margin: "0 0 3px", lineHeight: 1.1 }}>Ingredients</h2>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>{mrServes(recipe)}</div>
      {recipe.ingredients.map((grp, gi) => (
        <div key={gi} style={{ marginBottom: gi < recipe.ingredients.length - 1 ? 18 : 0 }}>
          {grp.group && <div className="eyebrow" style={{ color: recipe.accent, marginBottom: 10 }}>{grp.group}</div>}
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            {grp.items.map((it, ii) => {
              const k = gi + "-" + ii, on = checked[k];
              return (
                <li key={k}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "7px 0", cursor: "pointer" }}>
                    <span onClick={() => toggle(k)} style={{ width: 19, height: 19, flex: "0 0 auto", marginTop: 1, borderRadius: 6, border: on ? "none" : "1.5px solid var(--gold-line)", background: on ? "var(--brand)" : "#fff", display: "grid", placeItems: "center", transition: "background .15s" }}>
                      {on && <MRIcon name="check" size={12} stroke="#fff" w={2.6} />}
                    </span>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: on ? "var(--muted)" : "var(--ink)", lineHeight: 1.45, textDecoration: on ? "line-through" : "none", transition: "color .15s" }}>{it}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* shop the spices */
function MSpiceShop({ recipe, market, accent }) {
  const items = (recipe.spices || []).map(mrCat).filter(Boolean);
  if (!items.length) return null;
  return (
    <section style={{ background: "var(--bg)", padding: "8px 18px 36px" }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: "22px 18px" }}>
        <Eyebrow>Cook it with ours</Eyebrow>
        <h2 className="disp" style={{ fontSize: 24, color: "var(--brand)", margin: "10px 0 16px", lineHeight: 1.06 }}>Spices in this recipe</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((p) => <MSpiceRow key={p.name} p={p} market={market} accent={accent} />)}
        </div>
        <button className="btn" style={{ background: accent, color: "#fff", padding: "13px", fontSize: 14, marginTop: 16 }}>Add all to basket</button>
      </div>
    </section>
  );
}
function MSpiceRow({ p, market, accent }) {
  const [added, setAdded] = mrUse(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ width: 44, height: 44, borderRadius: 8, flex: "0 0 auto", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.05)" }}>
        <SpicePhoto spice={p} ratio="1 / 1" label={false} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="disp" style={{ fontSize: 16, color: "var(--ink)", lineHeight: 1.12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{mpPrice(p, market)} · 100g</div>
      </div>
      <button onClick={() => { setAdded(true); setTimeout(() => setAdded(false), 1100); }} aria-label={"Add " + p.name} style={{ flex: "0 0 auto", width: 34, height: 34, borderRadius: 9, border: `1.5px solid ${accent}`, background: added ? accent : "transparent", color: added ? "#fff" : accent, cursor: "pointer", display: "grid", placeItems: "center", transition: "background .15s" }}>
        <MRIcon name={added ? "check" : "plus"} size={17} stroke={added ? "#fff" : accent} w={2.2} />
      </button>
    </div>
  );
}

/* ============ DETAIL view ============ */
function MRecipeDetailView({ recipe, market, onBack }) {
  const accent = market === "local" ? "var(--brand)" : "var(--accent)";
  const stats = [["prep", "Prep", mrFmt(recipe.time.prep)], ["flame", "Cook", mrFmt(recipe.time.cook)], ["clock", "Total", mrFmt(mrTotal(recipe))], ["users", "Yield", mrServes(recipe).replace("Serves ", "")], ["gauge", "Level", recipe.difficulty]];
  return (
    <div style={{ minHeight: "100%", background: "var(--bg)" }}>
      {/* hero */}
      <header style={{ position: "relative", minHeight: 400, background: "#161412", color: "#FDFAF5", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${recipe.accent}, ${recipe.accent}66)` }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,8,6,.55) 0%, transparent 34%, transparent 48%, rgba(10,8,6,.92) 100%)" }} />
        <div style={{ position: "relative", zIndex: 2 }}><MPageBar title={recipe.course} onBack={onBack} /></div>
        <div style={{ position: "relative", marginTop: "auto", padding: "0 22px 28px", textAlign: "center" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#E6B860", display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ width: 16, height: 1.5, background: "#E6B860" }} />{recipe.course}
          </span>
          <h1 className="disp" style={{ fontSize: "clamp(28px,8vw,36px)", lineHeight: 1.05, margin: "0 0 14px", fontWeight: 600 }}>{recipe.title}</h1>
          <p className="prose" style={{ fontSize: 15, color: "rgba(253,250,245,.85)", margin: "0 auto", maxWidth: 320 }}>{recipe.dek}</p>
        </div>
      </header>

      {/* meta band */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)", display: "flex", overflowX: "auto" }} className="noscroll">
        {stats.map((s, i) => (
          <div key={s[1]} style={{ flex: "1 0 auto", display: "flex", alignItems: "center", gap: 9, justifyContent: "center", padding: "16px 16px", borderLeft: i ? "1px solid var(--line)" : "none" }}>
            <MRIcon name={s[0]} size={19} stroke="var(--brand)" />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)" }}>{s[1]}</div>
              <div className="disp" style={{ fontSize: 18, color: "var(--ink)", fontWeight: 600, whiteSpace: "nowrap" }}>{s[2]}</div>
            </div>
          </div>
        ))}
      </div>

      {/* intro */}
      <section style={{ padding: "30px 22px 8px" }}>
        <p className="prose" style={{ fontSize: 17, color: "var(--ink)", lineHeight: 1.6, margin: 0, fontStyle: "italic", fontWeight: 500 }}>{recipe.intro}</p>
        <Liyawel width={150} style={{ margin: "26px 0 28px", justifyContent: "flex-start" }} />
        <MIngredients recipe={recipe} />
      </section>

      {/* method */}
      <section style={{ padding: "28px 22px 8px" }}>
        <h2 className="disp" style={{ fontSize: 28, color: "var(--brand)", margin: "0 0 22px", lineHeight: 1.1 }}>Method</h2>
        <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {recipe.method.map((s, i) => (
            <li key={i} style={{ display: "flex", gap: 16, paddingBottom: 22, marginBottom: 22, borderBottom: i < recipe.method.length - 1 ? "1px solid var(--line)" : "none" }}>
              <span className="disp" style={{ flex: "0 0 auto", width: 40, height: 40, borderRadius: 999, display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--gold-line)", color: recipe.accent, fontSize: 19, fontWeight: 600 }}>{i + 1}</span>
              <p className="prose" style={{ fontSize: 16, color: "var(--ink)", margin: 0, lineHeight: 1.62, paddingTop: 6 }}>{s}</p>
            </li>
          ))}
        </ol>
        {recipe.tips && recipe.tips.length > 0 && (
          <div style={{ background: "#1A1A1A", color: "#FDFAF5", borderRadius: 16, padding: "24px 22px", marginTop: 4, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 120% at 100% 0%, rgba(15,110,86,.26), transparent 55%)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <MRIcon name="bulb" size={19} stroke="#E6B860" /><span className="eyebrow" style={{ color: "#E6B860" }}>Cook's notes</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {recipe.tips.map((t, i) => (
                  <li key={i} style={{ display: "flex", gap: 11, fontFamily: "var(--font-ui)", fontSize: 14, color: "rgba(253,250,245,.85)", lineHeight: 1.55 }}>
                    <span style={{ flex: "0 0 auto", marginTop: 2 }}><MRIcon name="leaf" size={15} stroke="#9FE3C4" /></span>{t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      <MSpiceShop recipe={recipe} market={market} accent={accent} />
      <MPageFooter market={market} />
    </div>
  );
}

/* ============ RECIPES hub ============ */
function MobileRecipes({ market = "intl" }) {
  const [course, setCourse] = mrUse("All");
  const [openSlug, setOpenSlug] = mrUse(null);
  const recipes = window.RECIPES;
  const featured = recipes.find((r) => r.featured) || recipes[0];

  if (openSlug) {
    const r = recipes.find((x) => x.slug === openSlug);
    return <MRecipeDetailView recipe={r} market={market} onBack={() => setOpenSlug(null)} />;
  }

  const grid = course === "All" ? recipes.filter((r) => r.slug !== featured.slug) : recipes.filter((r) => r.course === course);

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)" }}>
      <MPageBar title="Recipes" onBack={() => {}} />
      <MPageHero eyebrow="The Kitchen" title="Recipes from the hill country"
        lede="Curries roasted dark, spice-warmed bakes and slow evening drinks — written to actually cook from." />

      {course === "All" && (
        <section style={{ padding: "30px 18px 8px" }}>
          <button onClick={() => setOpenSlug(featured.slug)} style={{ display: "block", width: "100%", textAlign: "left", border: 0, background: "none", padding: 0, cursor: "pointer" }}>
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "16 / 11", boxShadow: "var(--shadow-md)" }}>
              <MRecipeImage recipe={featured} ratio="16 / 11" radius={12} />
              <span style={{ position: "absolute", top: 14, left: 14, background: "rgba(253,250,245,.94)", borderRadius: 999, padding: "6px 12px" }}>
                <MCourseTag accent={featured.accent}>Featured · {featured.course}</MCourseTag>
              </span>
            </div>
            <h2 className="disp" style={{ fontSize: 27, color: "var(--ink)", margin: "16px 0 12px", lineHeight: 1.1 }}>{featured.title}</h2>
            <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: "0 0 14px" }}>{featured.dek}</p>
            <MRMeta recipe={featured} />
          </button>
          <div style={{ height: 1, background: "var(--line)", margin: "30px 0 0" }} />
        </section>
      )}

      <section style={{ padding: "26px 18px 8px" }}>
        <div className="noscroll" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 26 }}>
          {window.RECIPE_COURSES.map((c) => {
            const on = course === c;
            return <button key={c} onClick={() => setCourse(c)} style={{ flex: "0 0 auto", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "8px 16px", borderRadius: 999,
              border: on ? "1px solid var(--brand)" : "1px solid var(--line)", background: on ? "var(--brand)" : "#fff", color: on ? "#fff" : "var(--ink)" }}>{c}</button>;
          })}
        </div>
        {grid.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 0" }}>
            <h3 className="disp" style={{ fontSize: 24, color: "var(--ink)", margin: 0 }}>No recipes in {course} yet</h3>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", marginTop: 8 }}>More are simmering — check back soon.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
            {grid.map((r) => (
              <button key={r.slug} onClick={() => setOpenSlug(r.slug)} style={{ display: "block", width: "100%", textAlign: "left", border: 0, background: "none", padding: 0, cursor: "pointer" }}>
                <MRecipeImage recipe={r} />
                <div style={{ paddingTop: 14 }}>
                  <MCourseTag accent={r.accent}>{r.course}</MCourseTag>
                  <h3 className="disp" style={{ fontSize: 22, color: "var(--ink)", margin: "10px 0 8px", lineHeight: 1.13 }}>{r.title}</h3>
                  <p className="prose" style={{ fontSize: 14.5, color: "var(--muted)", margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.dek}</p>
                  <MRMeta recipe={r} />
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

function MobileRecipeDetail({ market = "intl", slug }) {
  const recipes = window.RECIPES;
  const r = recipes.find((x) => x.slug === slug) || recipes.find((x) => x.featured) || recipes[0];
  return <MRecipeDetailView recipe={r} market={market} onBack={() => {}} />;
}

Object.assign(window, { MobileRecipes, MobileRecipeDetail, MRecipeDetailView });
