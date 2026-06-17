import { apiFetch } from "./http";
import type { Category } from "../types";

// Spec §6 — /categories
export function listCategories(
  revalidate: number | false = 600
): Promise<{ categories: Category[] }> {
  return apiFetch(`/categories`, { revalidate });
}
