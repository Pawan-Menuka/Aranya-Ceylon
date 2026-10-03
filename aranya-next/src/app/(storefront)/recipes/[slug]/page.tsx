import type { Metadata } from "next";
import { jsonLdHtml } from "@/lib/json-ld";
import { notFound } from "next/navigation";
import { resolveMarket } from "@/lib/market";
import { recipeTotal, type Recipe } from "@/lib/recipes-data";
import { RECIPES, getRecipe, recipeSpices } from "@/lib/recipes-demo";
import { fetchRecipeBySlug, fetchRecipes } from "@/lib/api/recipes";
import { getProductCardsByName } from "@/lib/api/products";
import { DEMO_MODE } from "@/lib/demo";
import { rethrowReadFailure } from "@/lib/api/read-failure";
import { toCatalogSpice } from "@/lib/catalog-data";
import type { CatalogSpice } from "@/lib/types";
import { SiteChrome } from "@/components/SiteChrome";
import { RecipeDetailClient } from "@/components/recipes/RecipeDetailClient";

export const revalidate = 3600;

// "Shop the spices" previously resolved names against the hardcoded demo
// catalog unconditionally, even with the live backend reachable — every
// add-to-cart from a recipe page became a phantom, checkout-invisible cart
// line (remaining-surfaces audit #4). Resolve against the live catalog
// first; fall back to the demo set only if the live fetch fails or a name
// doesn't resolve to anything live.
async function resolveShopSpices(recipe: Recipe): Promise<CatalogSpice[]> {
  if (!recipe.spices?.length) return [];
  try {
    const res = await getProductCardsByName(recipe.spices);
    const byName = new Map(res.products.map((p) => [p.name, toCatalogSpice(p)]));
    const resolved = recipe.spices.map((name) => byName.get(name)).filter((p): p is CatalogSpice => !!p);
    return resolved;
  } catch (error) {
    rethrowReadFailure(error);
    /* fall through to demo */
  }
  return DEMO_MODE ? recipeSpices(recipe) : [];
}

// Build-time enumeration is optional: unavailable API data must not block a
// release. Unlisted slugs resolve on request (dynamicParams defaults to true),
// where primary-read failures still reach the normal retry boundary.
export async function generateStaticParams() {
  try {
    const live = await fetchRecipes();
    return (live ?? (DEMO_MODE ? RECIPES : [])).map((r) => ({ slug: r.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await paramsPromise;
  const recipe = (await fetchRecipeBySlug(params.slug)) ?? getRecipe(params.slug);
  if (!recipe) return { title: "Recipe not found" };
  return {
    title: recipe.title,
    description: recipe.dek,
    alternates: { canonical: `/recipes/${recipe.slug}` },
    openGraph: { title: recipe.title, description: recipe.dek, type: "article" },
  };
}

export default async function RecipeDetailPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
  const market = await resolveMarket();
  const recipe = (await fetchRecipeBySlug(params.slug)) ?? getRecipe(params.slug);
  if (!recipe) notFound();

  const allRecipes = (await fetchRecipes()) ?? RECIPES;
  const related = allRecipes.filter((r) => r.slug !== recipe.slug).slice(0, 3);
  const shopSpices = await resolveShopSpices(recipe);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.dek,
    recipeCategory: recipe.course,
    recipeYield: recipe.serves > 0 ? `${recipe.serves} servings` : "1 jar",
    prepTime: `PT${recipe.time.prep}M`,
    cookTime: `PT${recipe.time.cook}M`,
    totalTime: `PT${recipeTotal(recipe)}M`,
    recipeIngredient: recipe.ingredients.flatMap((g) => g.items),
    recipeInstructions: recipe.method.map((step) => ({ "@type": "HowToStep", text: step })),
    author: { "@type": "Organization", name: "Aranya Ceylon" },
  };

  return (
    <SiteChrome initialMarket={market} hero>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <RecipeDetailClient recipe={recipe} related={related} shopSpices={shopSpices} />
    </SiteChrome>
  );
}
