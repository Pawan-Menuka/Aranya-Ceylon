import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveMarket } from "@/lib/market";
import { RECIPES, getRecipe, recipeTotal } from "@/lib/recipes-data";
import { SiteChrome } from "@/components/SiteChrome";
import { RecipeDetailClient } from "@/components/recipes/RecipeDetailClient";

export function generateStaticParams() {
  return RECIPES.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const recipe = getRecipe(params.slug);
  if (!recipe) return { title: "Recipe not found" };
  return {
    title: recipe.title,
    description: recipe.dek,
    alternates: { canonical: `/recipes/${recipe.slug}` },
    openGraph: { title: recipe.title, description: recipe.dek, type: "article" },
  };
}

export default function RecipeDetailPage({ params }: { params: { slug: string } }) {
  const market = resolveMarket();
  const recipe = getRecipe(params.slug);
  if (!recipe) notFound();
  const related = RECIPES.filter((r) => r.slug !== recipe.slug).slice(0, 3);

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RecipeDetailClient recipe={recipe} related={related} />
    </SiteChrome>
  );
}
