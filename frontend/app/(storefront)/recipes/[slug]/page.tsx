import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRecipe, getRecipeSlugs, type Recipe } from "@/lib/recipes";
import { resolveSpiceSlug } from "@/lib/api/products";

// Recipes are static file content — pre-render every slug at build time.
export async function generateStaticParams() {
  const slugs = await getRecipeSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getRecipe(slug);
  if (!recipe) return { title: "Recipe not found — Aranya Ceylon" };
  const desc = recipe.dek.slice(0, 155);
  return {
    title: `${recipe.title} — Aranya Ceylon`,
    description: desc,
    openGraph: {
      title: recipe.title,
      description: desc,
      type: "article",
      ...(recipe.publishedAt && { publishedTime: recipe.publishedAt }),
    },
  };
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const recipe = await getRecipe(slug);
  if (!recipe) notFound();
  const total = recipe.prep + recipe.cook;
  // Resolve each spice to its product page where the live catalog has a match;
  // unmatched spices fall back to the full catalog.
  const spiceLinks = await Promise.all(
    recipe.spices.map(async (name) => ({
      name,
      href: (await resolveSpiceSlug(name).then((s) => (s ? `/products/${s}` : null))) ?? "/products",
    })),
  );

  return (
    <main style={{ background: "var(--bg)", paddingBottom: 80 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(recipe)) }}
      />

      {/* Header */}
      <header style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 8px" }}>
        <nav style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
          <Link href="/recipes" style={{ color: "var(--muted)" }}>
            Recipes
          </Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span>{recipe.course}</span>
        </nav>
        <span
          style={{
            fontFamily: "var(--font-ui), sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            color: recipe.accent,
          }}
        >
          {recipe.course}
        </span>
        <h1
          className="disp"
          style={{ fontSize: "clamp(34px,5vw,56px)", lineHeight: 1.08, margin: "10px 0 16px", fontWeight: 600, color: "var(--ink)" }}
        >
          {recipe.title}
        </h1>
        <p className="prose" style={{ fontSize: 19, color: "var(--muted)", margin: "0 0 28px", maxWidth: 680 }}>
          {recipe.dek}
        </p>

        {/* Stat row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 0, borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
          <Stat label="Prep" value={`${recipe.prep} min`} />
          <Stat label="Cook" value={`${recipe.cook} min`} />
          <Stat label="Total" value={`${total} min`} />
          {recipe.serves > 0 && <Stat label="Serves" value={String(recipe.serves)} />}
          <Stat label="Level" value={recipe.difficulty} />
        </div>
      </header>

      {/* Intro */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 0" }}>{recipe.body}</section>

      {/* Ingredients + method */}
      <section
        style={{
          maxWidth: 980,
          margin: "16px auto 0",
          padding: "0 24px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 48,
          alignItems: "start",
        }}
      >
        {/* Ingredients */}
        <div>
          <h2 className="disp" style={{ fontSize: 28, margin: "0 0 20px", color: "var(--ink)" }}>
            Ingredients
          </h2>
          {recipe.ingredients.map((grp, gi) => (
            <div key={gi} style={{ marginBottom: 20 }}>
              {grp.group && (
                <h3
                  style={{
                    fontFamily: "var(--font-ui), sans-serif",
                    fontSize: 12.5,
                    fontWeight: 700,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: "var(--brand)",
                    margin: "0 0 10px",
                  }}
                >
                  {grp.group}
                </h3>
              )}
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {grp.items.map((it, i) => (
                  <li
                    key={i}
                    className="prose"
                    style={{
                      fontSize: 16,
                      color: "var(--ink)",
                      padding: "9px 0",
                      borderBottom: "1px solid var(--line)",
                      display: "flex",
                      gap: 12,
                    }}
                  >
                    <span aria-hidden style={{ color: recipe.accent, fontWeight: 700 }}>
                      ·
                    </span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Method */}
        <div>
          <h2 className="disp" style={{ fontSize: 28, margin: "0 0 20px", color: "var(--ink)" }}>
            Method
          </h2>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, counterReset: "step" }}>
            {recipe.method.map((step, i) => (
              <li key={i} style={{ display: "flex", gap: 16, marginBottom: 22 }}>
                <span
                  aria-hidden
                  className="disp"
                  style={{
                    flex: "0 0 auto",
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: `${recipe.accent}1f`,
                    color: recipe.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  {i + 1}
                </span>
                <p className="prose" style={{ fontSize: 16.5, lineHeight: 1.6, color: "var(--ink)", margin: 0 }}>
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Tips */}
      {recipe.tips && recipe.tips.length > 0 && (
        <section style={{ maxWidth: 980, margin: "40px auto 0", padding: "0 24px" }}>
          <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: "28px 32px" }}>
            <h2 className="disp" style={{ fontSize: 24, margin: "0 0 14px", color: "var(--ink)" }}>
              Notes from the kitchen
            </h2>
            <ul className="prose" style={{ fontSize: 16, lineHeight: 1.6, color: "var(--ink)", margin: 0, paddingLeft: 20 }}>
              {recipe.tips.map((tip, i) => (
                <li key={i} style={{ marginBottom: 8 }}>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Shop the spices */}
      {recipe.spices.length > 0 && (
        <section style={{ maxWidth: 980, margin: "40px auto 0", padding: "0 24px" }}>
          <h2 className="disp" style={{ fontSize: 24, margin: "0 0 16px", color: "var(--ink)" }}>
            Spices in this recipe
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {spiceLinks.map(({ name, href }) => (
              <Link
                key={name}
                href={href}
                style={{
                  fontFamily: "var(--font-ui), sans-serif",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--ink)",
                  border: "1px solid var(--line)",
                  borderRadius: 999,
                  padding: "8px 16px",
                  textDecoration: "none",
                  background: "#fff",
                }}
              >
                {name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div style={{ maxWidth: 980, margin: "56px auto 0", padding: "32px 24px 0", borderTop: "1px solid var(--line)", textAlign: "center" }}>
        <Link href="/recipes" style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 14, fontWeight: 700, color: "var(--brand)" }}>
          ← All recipes
        </Link>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: "1 1 90px", padding: "14px 4px", textAlign: "center" }}>
      <div
        style={{
          fontFamily: "var(--font-ui), sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div className="disp" style={{ fontSize: 22, color: "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}

function buildJsonLd(r: Recipe) {
  const isoDuration = (min: number) => `PT${min}M`;
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: r.title,
    description: r.dek,
    recipeCategory: r.course,
    ...(r.publishedAt && { datePublished: r.publishedAt }),
    prepTime: isoDuration(r.prep),
    cookTime: isoDuration(r.cook),
    totalTime: isoDuration(r.prep + r.cook),
    ...(r.serves > 0 && { recipeYield: `${r.serves} servings` }),
    recipeIngredient: r.ingredients.flatMap((g) => g.items),
    recipeInstructions: r.method.map((step) => ({ "@type": "HowToStep", text: step })),
    author: { "@type": "Organization", name: "Aranya Ceylon" },
  };
}
