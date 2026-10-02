import { publicApiFetch, type PublicRequestOptions } from "./public";
import type { Category, CategorySummary } from "../types";

// Spec §6 — /categories
export function listCategories(
  revalidate: number | false = 600
): Promise<{ categories: Category[] }> {
  return publicApiFetch(`/categories`, { revalidate });
}

export function getCategorySummary(options: PublicRequestOptions = {}): Promise<CategorySummary> {
  return publicApiFetch(`/categories?view=summary`, options);
}
