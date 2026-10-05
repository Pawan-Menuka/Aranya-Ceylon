import type { Recipe, IngredientGroup } from "@/lib/recipes-data";
import { publicApiFetch } from "./public";
import { rethrowReadFailure } from "./read-failure";

// Server-side only — called from Next.js server components / page.tsx.
// Dynamic SSR shares verified-market public data, tagged for invalidation.
// Deliberate demo fallbacks remain; production transport failures offer retry.

interface ApiRecipe {
  id: string;
  slug: string;
  title: string;
  dek: string;
  course: string;
  accent: string;
  slot: string;
  featured: boolean;
  prepMins: number;
  cookMins: number;
  serves: number;
  difficulty: string;
  intro: string;
  spices: string[];
  ingredients: IngredientGroup[];
  method: string[];
  tips: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

function toRecipe(r: ApiRecipe): Recipe {
  return {
    slug: r.slug,
    title: r.title,
    dek: r.dek,
    course: r.course,
    accent: r.accent,
    slot: r.slot,
    featured: r.featured,
    time: { prep: r.prepMins, cook: r.cookMins },
    serves: r.serves,
    difficulty: r.difficulty,
    intro: r.intro,
    spices: r.spices,
    ingredients: r.ingredients,
    method: r.method,
    tips: r.tips,
  };
}

export async function fetchRecipes(course?: string): Promise<Recipe[] | null> {
  try {
    const qs = course && course !== "All" ? `?course=${encodeURIComponent(course)}` : "";
    const data = await publicApiFetch<{ recipes: ApiRecipe[] }>(`/recipes${qs}`, { revalidate: 3600 });
    return data.recipes.map(toRecipe);
  } catch (error) {
    rethrowReadFailure(error);
    return null;
  }
}

export async function fetchRecipeBySlug(slug: string): Promise<Recipe | null> {
  try {
    const data = await publicApiFetch<{ recipe: ApiRecipe }>(`/recipes/${encodeURIComponent(slug)}`, { revalidate: 3600 });
    return toRecipe(data.recipe);
  } catch (error) {
    rethrowReadFailure(error);
    return null;
  }
}
