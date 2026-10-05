// Recipes dataset (ported from recipes-data.js), typed. Richer than journal
// posts: timings, yield, difficulty, grouped ingredients, numbered method, tips,
// and the catalog spice names each recipe features (for "shop the spices").
// The demo set is the SSG/ISR fallback; live recipes would map onto this shape.
export interface IngredientGroup {
  group?: string;
  items: string[];
}
export interface Recipe {
  slug: string;
  title: string;
  dek: string;
  course: string;
  accent: string;
  slot: string;
  featured: boolean;
  time: { prep: number; cook: number };
  serves: number;
  difficulty: string;
  intro: string;
  spices: string[];
  ingredients: IngredientGroup[];
  method: string[];
  tips: string[];
}

export const RECIPE_COURSES = ["All", "Curries & Mains", "Sweet & Bakes", "Drinks", "Sides & Basics"];


// ---- helpers ----
export function recipeTotal(r: Recipe): number {
  return (r.time.prep || 0) + (r.time.cook || 0);
}
export function fmtMins(m: number): string {
  if (m < 60) return m + " min";
  const h = Math.floor(m / 60), mm = m % 60;
  return h + " hr" + (mm ? " " + mm : "");
}
export function fmtMinsLong(m: number): string {
  if (m < 60) return m + " min";
  const h = Math.floor(m / 60), mm = m % 60;
  return h + " hr" + (mm ? " " + mm + " min" : "");
}
export function recipeServes(r: Recipe): string {
  return r.serves > 0 ? "Serves " + r.serves : "Makes 1 jar";
}
