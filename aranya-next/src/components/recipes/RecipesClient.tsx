"use client";

import * as React from "react";
import Link from "next/link";
import type { Recipe } from "@/lib/recipes-data";
import { RECIPE_COURSES, recipeTotal, fmtMins, recipeServes } from "@/lib/recipes-data";
import { Reveal } from "../primitives/Reveal";
import { Liyawel, Eyebrow } from "../primitives/Motif";
import { ImageSlot } from "../primitives/ImageSlot";

// Recipes hub (ported from recipes.jsx). Featured spotlight + course chips +
// 3-up grid. Cards link to /recipes/[slug].

export function RIcon({ name, size = 18, stroke = "currentColor", w = 1.7 }: { name: string; size?: number; stroke?: string; w?: number }) {
  const p: Record<string, React.ReactNode> = {
    clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
    users: (<><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.4 2.9-5.5 6.5-5.5S15.5 16.6 15.5 20" /><path d="M16 5.2A3 3 0 0 1 16 11M16.5 14.6c2.6.5 4.5 2.3 4.5 5" /></>),
    gauge: (<><path d="M3.5 16a9 9 0 1 1 17 0" /><path d="M12 16l4-4" /><circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none" /></>),
    chevron: <path d="M6 9l6 6 6-6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>{p[name]}</svg>;
}

function RecipeImage({ recipe, ratio = "3 / 2", radius = 9 }: { recipe: Recipe; ratio?: string; radius?: number }) {
  return (
    <div style={{ position: "relative", borderRadius: radius, overflow: "hidden", aspectRatio: ratio }}>
      <ImageSlot id={recipe.slot} shape="rect" fit="cover" placeholder={`Drop a photo of ${recipe.title}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(155deg, ${recipe.accent}33, ${recipe.accent}aa)`, mixBlendMode: "multiply", pointerEvents: "none" }} />
    </div>
  );
}

function CourseTag({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: accent, display: "inline-flex", alignItems: "center", gap: 7 }}>
      <span style={{ width: 16, height: 1.5, background: accent }} />{children}
    </span>
  );
}

function RMeta({ recipe, color = "var(--muted)", gap = 16 }: { recipe: Recipe; color?: string; gap?: number }) {
  const items: [string, string][] = [["clock", fmtMins(recipeTotal(recipe))], ["users", recipeServes(recipe)], ["gauge", recipe.difficulty]];
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

function FeaturedRecipe({ recipe }: { recipe: Recipe }) {
  const [h, setH] = React.useState(false);
  return (
    <section style={{ background: "var(--bg)", padding: "64px 0 8px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <Reveal>
          <Link href={"/recipes/" + recipe.slug} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} className="jf-grid" style={{ textDecoration: "none" }}>
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
          </Link>
        </Reveal>
        <div style={{ height: 1, background: "var(--line)", margin: "60px 0 0" }} />
      </div>
    </section>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [h, setH] = React.useState(false);
  return (
    <Link href={"/recipes/" + recipe.slug} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ display: "flex", flexDirection: "column", textDecoration: "none" }}>
      <div style={{ boxShadow: h ? "var(--shadow-md)" : "none", borderRadius: 9, transition: "box-shadow .3s, transform .3s", transform: h ? "translateY(-3px)" : "none" }}>
        <RecipeImage recipe={recipe} />
      </div>
      <div style={{ paddingTop: 18 }}>
        <CourseTag accent={recipe.accent}>{recipe.course}</CourseTag>
        <h3 className="disp" style={{ fontSize: 25, color: "var(--ink)", margin: "12px 0 10px", lineHeight: 1.12, letterSpacing: ".005em" }}>{recipe.title}</h3>
        <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: "0 0 16px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{recipe.dek}</p>
        <RMeta recipe={recipe} gap={14} />
      </div>
    </Link>
  );
}

function RecipeChips({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center" }}>
      {RECIPE_COURSES.map((c) => {
        const on = value === c;
        return (
          <button key={c} onClick={() => onChange(c)} style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, cursor: "pointer", padding: "9px 18px", borderRadius: 999, transition: "all .15s", border: on ? "1px solid var(--brand)" : "1px solid var(--line)", background: on ? "var(--brand)" : "#fff", color: on ? "#fff" : "var(--ink)" }}>{c}</button>
        );
      })}
    </div>
  );
}

export function RecipesClient({ recipes }: { recipes: Recipe[] }) {
  const [course, setCourse] = React.useState("All");
  const featured = recipes.find((r) => r.featured) || recipes[0];
  const grid = React.useMemo(() => {
    if (course === "All") return recipes.filter((r) => r.slug !== featured.slug);
    return recipes.filter((r) => r.course === course);
  }, [course, recipes, featured]);

  return (
    <div data-screen-label="Recipes">
      <header style={{ background: "var(--brand)", color: "#FDFAF5", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.5, background: "radial-gradient(120% 90% at 88% -10%, rgba(29,158,117,.55) 0%, transparent 52%)" }} />
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "132px 40px 56px", position: "relative", textAlign: "center" }}>
          <Reveal><Liyawel width={150} color="rgba(230,184,96,.55)" accent="rgba(230,184,96,.7)" style={{ marginBottom: 22 }} /></Reveal>
          <Reveal delay={60}><Eyebrow center light>The Kitchen</Eyebrow></Reveal>
          <Reveal delay={100}><h1 className="disp" style={{ fontSize: "clamp(48px,6vw,84px)", lineHeight: 1.0, margin: "16px 0 14px", fontWeight: 600, letterSpacing: ".005em" }}>Recipes from the hill country</h1></Reveal>
          <Reveal delay={150}><p className="prose" style={{ fontSize: 18, color: "rgba(253,250,245,.8)", margin: "0 auto", maxWidth: 560 }}>Curries roasted dark, spice-warmed bakes and slow evening drinks — the dishes our spices were grown for, written to actually cook from.</p></Reveal>
        </div>
      </header>
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
            <div className="jg-grid">
              {grid.map((r) => <RecipeCard key={r.slug} recipe={r} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
