import { redirect } from "next/navigation";
import { listCategories } from "@/lib/api/categories";

// /categories/[slug] — the categories landing deep-links into the filtered
// catalog, so a direct category URL resolves to /products?cat=<name>. We map the
// slug to a display name via the live categories endpoint (falling back to a
// title-cased slug) and redirect, keeping a single canonical catalog view.
const STATIC_NAMES: Record<string, string> = {
  "whole-spices": "Whole Spices",
  ground: "Ground",
  "ground-powders": "Ground",
  blends: "Blends",
  "estate-blends": "Blends",
};

function titleCase(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default async function CategorySlugPage({ params }: { params: { slug: string } }) {
  let name = STATIC_NAMES[params.slug];
  if (!name) {
    try {
      const { categories } = await listCategories();
      name = categories.find((c) => c.slug === params.slug)?.name || titleCase(params.slug);
    } catch {
      name = titleCase(params.slug);
    }
  }
  redirect("/products?cat=" + encodeURIComponent(name));
}
