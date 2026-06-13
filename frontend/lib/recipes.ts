import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { ReactElement } from "react";
import { compileMDX } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/components/Mdx";

// Recipes are file-based content (content/recipes/*.mdx): structured fields in
// YAML frontmatter, the intro prose as the markdown body. Rendered fully on the
// server with no DB/API call — adding a recipe is "drop a file + push", and
// customers get pre-rendered HTML with zero client-side loading.
const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");

export interface IngredientGroup {
  group?: string;
  items: string[];
}

// Shape of a recipe file's frontmatter (parsed from YAML by compileMDX).
export interface RecipeMeta {
  title: string;
  dek: string;
  course: string;
  accent: string; // spice colour for the stripe/tint
  featured?: boolean;
  prep: number; // minutes
  cook: number; // minutes
  serves: number; // 0 = "makes a batch" (no serving count)
  difficulty: string;
  spices: string[]; // catalog product names — "shop the spices"
  ingredients: IngredientGroup[];
  method: string[];
  tips?: string[];
  publishedAt?: string; // ISO date
}

export interface RecipeMetaWithSlug extends RecipeMeta {
  slug: string;
}

export interface Recipe extends RecipeMetaWithSlug {
  body: ReactElement; // rendered intro prose
}

export const getRecipeSlugs = cache(async (): Promise<string[]> => {
  let files: string[];
  try {
    files = await fs.readdir(RECIPES_DIR);
  } catch {
    return [];
  }
  return files.filter((f) => f.endsWith(".mdx")).map((f) => f.replace(/\.mdx$/, ""));
});

// Full recipe incl. rendered intro body. null when the file is missing.
export const getRecipe = cache(async (slug: string): Promise<Recipe | null> => {
  let raw: string;
  try {
    raw = await fs.readFile(path.join(RECIPES_DIR, `${slug}.mdx`), "utf8");
  } catch {
    return null;
  }
  const { content, frontmatter } = await compileMDX<RecipeMeta>({
    source: raw,
    components: mdxComponents,
    options: { parseFrontmatter: true },
  });
  return { slug, body: content, ...frontmatter };
});

// All recipes' metadata for the index/sitemap, newest first. The compiled body
// is discarded here (the index only needs frontmatter).
export const getAllRecipes = cache(async (): Promise<RecipeMetaWithSlug[]> => {
  const slugs = await getRecipeSlugs();
  const recipes = await Promise.all(slugs.map((slug) => getRecipe(slug)));
  return recipes
    .filter((r): r is Recipe => r !== null)
    .map(({ body, ...meta }) => meta)
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
});

export const RECIPE_COURSES = ["Curries & Mains", "Sweet & Bakes", "Drinks", "Sides & Basics"];
