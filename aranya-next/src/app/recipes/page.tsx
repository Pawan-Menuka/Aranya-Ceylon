import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { RECIPES } from "@/lib/recipes-data";
import { SiteChrome } from "@/components/SiteChrome";
import { RecipesClient } from "@/components/recipes/RecipesClient";

export const metadata: Metadata = {
  title: "Recipes",
  description: "Curries roasted dark, spice-warmed bakes and slow evening drinks — the dishes our Ceylon spices were grown for, written to actually cook from.",
  alternates: { canonical: "/recipes" },
};

// Recipes are curated content (no live endpoint in the spec), so the demo set is
// the source. Served SSG.
export default function RecipesPage() {
  const market = resolveMarket();
  return (
    <SiteChrome initialMarket={market}>
      <RecipesClient recipes={RECIPES} />
    </SiteChrome>
  );
}
