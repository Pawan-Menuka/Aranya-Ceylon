import type { Page, Route } from "@playwright/test";

export const CART_KEY = "aranya_cart_v1";
export const ORDER_ID = "order-e2e-123";

export const cartItem = {
  id: "v:variant-e2e",
  name: "Ceylon Cinnamon Quills",
  latin: "Cinnamomum verum",
  weight: "100g",
  form: "Whole",
  color: "#B5651D",
  base: "#C2772E",
  deep: "#7E481A",
  surface: "#F3E7D4",
  base100Usd: 14.5,
  base100Lkr: 2_150,
  qty: 1,
  productId: "product-e2e",
  variantId: "variant-e2e",
  backendItemId: "cart-item-e2e",
  unitUsd: 14.5,
  unitLkr: 2_150,
};

const totals = {
  subtotalCents: 1_450,
  shippingCents: 499,
  discountCents: 0,
  giftCents: 0,
  totalCents: 1_949,
  subtotal: 14.5,
  shippingCost: 4.99,
  discount: 0,
  gift: 0,
  total: 19.49,
  shippingLabel: "Tracked international",
  currency: "USD",
  couponId: null,
};

export interface CheckoutApiState {
  createIntentCalls: number;
  createIntentBody?: Record<string, unknown>;
  stubCompleteBody?: Record<string, unknown>;
}

interface CheckoutApiOptions {
  createIntentError?: { status: number; error: string };
}

async function jsonBody(route: Route): Promise<Record<string, unknown>> {
  return JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
}

export async function seedCart(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, item }) => localStorage.setItem(key, JSON.stringify([item])),
    { key: CART_KEY, item: cartItem },
  );
}

export async function mockCheckoutApi(
  page: Page,
  options: CheckoutApiOptions = {},
): Promise<CheckoutApiState> {
  const state: CheckoutApiState = { createIntentCalls: 0 };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();

    if (pathname === "/api/auth/refresh" && method === "POST") {
      await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
      return;
    }

    if (pathname === "/api/cart/totals" && method === "GET") {
      await route.fulfill({ json: { totals } });
      return;
    }

    if (pathname === "/api/cart" && method === "GET") {
      await route.fulfill({
        json: { cart: { id: "cart-e2e", items: [] }, market: "INTERNATIONAL" },
      });
      return;
    }

    if (pathname === "/api/cart" && method === "DELETE") {
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    if (pathname === "/api/checkout/create-intent" && method === "POST") {
      state.createIntentCalls += 1;
      state.createIntentBody = await jsonBody(route);
      if (options.createIntentError) {
        await route.fulfill({
          status: options.createIntentError.status,
          json: { error: options.createIntentError.error },
        });
      } else {
        await route.fulfill({
          json: { provider: "stub", orderId: ORDER_ID, total: 19.49, currency: "USD" },
        });
      }
      return;
    }

    if (pathname === "/api/checkout/stub/complete" && method === "POST") {
      state.stubCompleteBody = await jsonBody(route);
      await route.fulfill({ json: { ok: true, orderId: ORDER_ID, status: "PAID" } });
      return;
    }

    if (pathname === `/api/orders/${ORDER_ID}` && method === "GET") {
      await route.fulfill({ json: { order: { id: ORDER_ID, status: "PAID" } } });
      return;
    }

    await route.fulfill({ status: 404, json: { error: `Unmocked request: ${method} ${pathname}` } });
  });

  return state;
}
