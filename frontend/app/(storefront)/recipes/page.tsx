import type { Metadata } from "next";
import { getAllRecipes, RECIPE_COURSES } from "@/lib/recipes";
import { RecipeGrid } from "@/components/RecipeGrid";

export const metadata: Metadata = {
  title: "Recipes — Aranya Ceylon",
  description:
    "Hill-country recipes built around single-origin Ceylon spice — curries, bakes, drinks and the kitchen basics worth making from scratch.",
  openGraph: {
    title: "Recipes — Aranya Ceylon",
    description: "Hill-country recipes built around single-origin Ceylon spice.",
    type: "website",
  },
};

export default async function RecipesPage() {
  const recipes = await getAllRecipes();
  // Only show course chips that actually have recipes.
  const present = RECIPE_COURSES.filter((c) => recipes.some((r) => r.course === c));
  const courses = ["All", ...present];

  return (
    <div>
      <header style={{ background: "var(--brand)", color: "#FDFAF5", position: "relative", overflow: "hidden" }}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.5,
            background: "radial-gradient(120% 90% at 88% -10%, rgba(29,158,117,.55) 0%, transparent 52%)",
          }}
        />
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "72px 40px 56px", position: "relative", textAlign: "center" }}>
          <span className="eyebrow" style={{ color: "rgba(230,184,96,.9)" }}>
            From the Aranya Kitchen
          </span>
          <h1
            className="disp"
            style={{ fontSize: "clamp(48px,6vw,84px)", lineHeight: 1.0, margin: "16px 0 14px", fontWeight: 600 }}
          >
            Recipes
          </h1>
          <p className="prose" style={{ fontSize: 18, color: "rgba(253,250,245,.8)", margin: "0 auto", maxWidth: 560 }}>
            Hill-country cooking built around single-origin spice — curries roasted dark, bakes that lean on true
            cinnamon, and the kitchen basics worth making from scratch.
          </p>
        </div>
      </header>

      <section style={{ background: "var(--bg)", padding: "64px 0 96px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
          {recipes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "70px 0" }}>
              <h3 className="disp" style={{ fontSize: 28, color: "var(--ink)", margin: 0 }}>
                No recipes yet
              </h3>
              <p style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 15, color: "var(--muted)", marginTop: 8 }}>
                The first recipes are on the way.
              </p>
            </div>
          ) : (
            <RecipeGrid recipes={recipes} courses={courses} />
          )}
        </div>
      </section>
    </div>
  );
}
