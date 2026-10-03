import { apiFetch } from "./http";
import type { Order } from "../types";

// Spec §6 — /orders (auth, scoped to the user).
export function listOrders(): Promise<{ orders: Order[] }> {
  return apiFetch(`/orders`, { auth: true });
}

