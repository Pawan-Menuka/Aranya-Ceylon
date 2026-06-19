import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { RECIPES } from "@/lib/recipes-data";
import { fetchRecipes } from "@/lib/api/recipes";
import { SiteChrome } from "@/components/SiteChrome";
import { RecipesClient } from "@/components/recipes/RecipesClient";

export const metadata: Metadata = {
  title: "Recipes",
  description: "Curries roasted dark, spice-warmed bakes and slow evening drinks — the dishes our Ceylon spices were grown for, written to actually cook from.",
  alternates: { canonical: "/recipes" },
};

export const revalidate = 3600; // ISR: revalidate every hour

export default async function RecipesPage() {
  const market = resolveMarket();
  // Prefer live DB data; fall back to static file when backend is unavailable
  const recipes = (await fetchRecipes()) ?? RECIPES;
  return (
    <SiteChrome initialMarket={market}>
      <RecipesClient recipes={recipes} />
    </SiteChrome>
  );
}
