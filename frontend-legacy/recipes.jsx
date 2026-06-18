/* Aranya Ceylon — Recipes hub UI.
   Depends on recipes-data.js (RECIPES, RECIPE_COURSES), home-common.jsx (Reveal, Liyawel,
   Eyebrow), shared.jsx (Icon), image-slot.js, navbar.jsx. Exports RecipesPage. */
const { useState: rcUse, useMemo: rcMemo } = React;

/* ---- helpers ---- */
function rTotal(r) { return (r.time.prep || 0) + (r.time.cook || 0); }
function fmtMins(m) { if (m < 60) return m + " min"; const h = Math.floor(m / 60), mm = m % 60; return h + " hr" + (mm ? " " + mm : ""); }
function rServes(r) { return r.serves > 0 ? "Serves " + r.serves : "Makes 1 jar"; }

/* ---- icons ---- */
function RIcon({ name, size = 18, stroke = "currentColor", w = 1.7 }) {
  const p = {
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    users: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.4 2.9-5.5 6.5-5.5S15.5 16.6 15.5 20" /><path d="M16 5.2A3 3 0 0 1 16 11M16.5 14.6c2.6.5 4.5 2.3 4.5 5" /></>,
    gauge: <><path d="M3.5 16a9 9 0 1 1 17 0" /><path d="M12 16l4-4" /><circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none" /></>,
    flame: <><path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1.5.6-2.4 1.3-3.2C10 9 11.5 7 12 3z" /></>,
    chevron: <path d="M6 9l6 6 6-6" />,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    check: <path d="M5 12l5 5L20 6" />,
    printer: <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    bowl: <><path d="M3 11h18a9 9 0 0 1-18 0z" /><path d="M8 11c0-2 1.5-3 2-5M12 11c0-2 1.5-3 2-5" /></>,
    leaf: <><path d="M11 21C5 18 4 9 20 4c1 9-3 16-12 14-2-4 1-9 7-11" /></>,
  }[name];
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>{p}</svg>;
}

function RecipeImage({ recipe, ratio = "3 / 2", radius = 9 }) {
  return (
    <div style={{ position: "relative", borderRadius: radius, overflow: "hidden", aspectRatio: ratio }}>
      <image-slot id={recipe.slot} shape="rect" fit="cover" placeholder={`Drop a photo of ${recipe.title}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}></image-slot>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(155deg, ${recipe.accent}33, ${recipe.accent}aa)`, mixBlendMode: "multiply", pointerEvents: "none" }} />
    </div>
  );
}

function CourseTag({ children, accent, onDark }) {
  return (
    <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase",
      color: onDark ? "#fff" : accent, display: "inline-flex", alignItems: "center", gap: 7 }}>
      <span style={{ width: 16, height: 1.5, background: onDark ? "#E6B860" : accent }} />{children}
    </span>
  );
}

function RMeta({ recipe, color = "var(--muted)", gap = 16 }) {
  const items = [["clock", fmtMins(rTotal(recipe))], ["users", rServes(recipe)], ["gauge", recipe.difficulty]];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap, alignItems: "center" }}>
      {items.map(([ic, t]) => (
        <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--font-ui)", fontSize: 12.5, color, fontWeight: 600 }}>
          <RIcon name={ic} size={15} stroke={color} />{t}
        </span>
      ))}
    </div>
  );
}

/* ---- header ---- */
function RecipesHeader() {
  return (
    <header style={{ background: "var(--brand)", color: "#FDFAF5", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, opacity: .5, background: "radial-gradient(120% 90% at 88% -10%, rgba(29,158,117,.55) 0%, transparent 52%)" }} />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "132px 40px 56px", position: "relative", textAlign: "center" }}>
        <Reveal><Liyawel width={150} color="rgba(230,184,96,.55)" accent="rgba(230,184,96,.7)" style={{ marginBottom: 22 }} /></Reveal>
        <Reveal delay={60}><Eyebrow center light>The Kitchen</Eyebrow></Reveal>
        <Reveal delay={100}>
          <h1 className="disp" style={{ fontSize: "clamp(48px,6vw,84px)", lineHeight: 1.0, margin: "16px 0 14px", fontWeight: 600, letterSpacing: ".005em" }}>
            Recipes from the hill country
          </h1>
        </Reveal>
        <Reveal delay={150}>
          <p className="prose" style={{ fontSize: 18, color: "rgba(253,250,245,.8)", margin: "0 auto", maxWidth: 560 }}>
            Curries roasted dark, spice-warmed bakes and slow evening drinks — the dishes our spices were grown for, written to actually cook from.
          </p>
        </Reveal>
      </div>
    </header>
  );
}

/* ---- featured spotlight ---- */
function FeaturedRecipe({ recipe }) {
  const [h, setH] = rcUse(false);
  return (
    <section style={{ background: "var(--bg)", padding: "64px 0 8px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <Reveal>
          <a href={"RecipeDetail.html?recipe=" + recipe.slug} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
            className="rf-grid" style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 44, alignItems: "center", textDecoration: "none" }}>
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "16 / 11", boxShadow: h ? "var(--shadow-lg)" : "var(--shadow-md)", transition: "box-shadow .3s" }}>
              <RecipeImage recipe={recipe} ratio="16 / 11" radius={12} />
              <span style={{ position: "absolute", top: 18, left: 18, background: "rgba(253,250,245,.94)", borderRadius: 999, padding: "7px 14px" }}>
                <CourseTag accent={recipe.accent}>Featured · {recipe.course}</CourseTag>
              </span>
            </div>
            <div>
              <h2 className="disp" style={{ fontSize: "clamp(30px,3.2vw,44px)", color: "var(--ink)", margin: "0 0 16px", lineHeight: 1.08, letterSpacing: ".005em" }}>{recipe.title}</h2>
              <p className="prose" style={{ fontSize: 18, color: "var(--muted)", margin: "0 0 22px" }}>{recipe.dek}</p>
              <RMeta recipe={recipe} />
              <div style={{ marginTop: 24, fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--brand)", display: "inline-flex", alignItems: "center", gap: 8 }}>
                Cook this
                <span style={{ transform: h ? "translateX(4px)" : "none", transition: "transform .2s" }}><RIcon name="chevron" size={15} stroke="var(--brand)" /></span>
              </div>
            </div>
          </a>
        </Reveal>
        <div style={{ height: 1, background: "var(--line)", margin: "60px 0 0" }} />
      </div>
    </section>
  );
}

/* ---- recipe card ---- */
function RecipeCard({ recipe }) {
  const [h, setH] = rcUse(false);
  return (
    <a href={"RecipeDetail.html?recipe=" + recipe.slug} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "flex", flexDirection: "column", textDecoration: "none" }}>
      <div style={{ boxShadow: h ? "var(--shadow-md)" : "none", borderRadius: 9, transition: "box-shadow .3s", transform: h ? "translateY(-3px)" : "none" }}>
        <RecipeImage recipe={recipe} />
      </div>
      <div style={{ paddingTop: 18 }}>
        <CourseTag accent={recipe.accent}>{recipe.course}</CourseTag>
        <h3 className="disp" style={{ fontSize: 25, color: "var(--ink)", margin: "12px 0 10px", lineHeight: 1.12, letterSpacing: ".005em" }}>{recipe.title}</h3>
        <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: "0 0 16px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{recipe.dek}</p>
        <RMeta recipe={recipe} gap={14} />
      </div>
    </a>
  );
}

/* ---- course chips ---- */
function RecipeChips({ value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center" }}>
      {window.RECIPE_COURSES.map((c) => {
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

/* ---- page ---- */
function RecipesPage({ market, cartCount, onCartClick, onAccountClick }) {
  const [course, setCourse] = rcUse("All");
  const recipes = window.RECIPES;
  const featured = recipes.find((r) => r.featured) || recipes[0];
  const grid = rcMemo(() => {
    if (course === "All") return recipes.filter((r) => r.slug !== featured.slug);
    return recipes.filter((r) => r.course === course);
  }, [course]);

  return (
    <div className="aranya">
      <AranyaNavbar market={market} heroMode={false} cartCount={cartCount} onCartClick={onCartClick} onAccountClick={onAccountClick} />
      <RecipesHeader />
      {course === "All" && <FeaturedRecipe recipe={featured} />}

      <section style={{ background: "var(--bg)", padding: "48px 0 96px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
          <div style={{ marginBottom: 44 }}><RecipeChips value={course} onChange={setCourse} /></div>
          {grid.length === 0 ? (
            <div style={{ textAlign: "center", padding: "70px 0" }}>
              <h3 className="disp" style={{ fontSize: 28, color: "var(--ink)", margin: 0 }}>No recipes in {course} yet</h3>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--muted)", marginTop: 8 }}>More are simmering — check back soon.</p>
            </div>
          ) : (
            <div className="rg-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
              {grid.map((r) => <RecipeCard key={r.slug} recipe={r} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { RecipesPage });
