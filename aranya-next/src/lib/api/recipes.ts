import type { Recipe, IngredientGroup } from "@/lib/recipes-data";

// Server-side only — called from Next.js server components / page.tsx.
// Uses fetch() directly (no BFF proxy needed for public endpoints).
// Falls back gracefully when the backend is unavailable so SSG/ISR can
// still build from the static recipes-data.ts fallback.

// Standardise on NEXT_PUBLIC_API_URL (the one env var the rest of the app + the
// .env.example use). BACKEND_URL is kept only as a legacy fallback — relying on
// it alone meant a deploy documented per .env.example silently fell back to
// localhost and served static demo data forever (BUG-17).
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? process.env.BACKEND_URL ?? "http://localhost:4000";

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
    const res = await fetch(`${API_BASE}/recipes${qs}`, {
      next: { revalidate: 3600 }, // ISR: revalidate every hour
    });
    if (!res.ok) return null;
    const data = await res.json() as { recipes: ApiRecipe[] };
    return data.recipes.map(toRecipe);
  } catch {
    return null;
  }
}

export async function fetchRecipeBySlug(slug: string): Promise<Recipe | null> {
  try {
    const res = await fetch(`${API_BASE}/recipes/${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json() as { recipe: ApiRecipe };
    return toRecipe(data.recipe);
  } catch {
    return null;
  }
}
