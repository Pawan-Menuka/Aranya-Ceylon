import { expect, test, type Page } from "@playwright/test";
import {
  CART_KEY,
  ORDER_ID,
  cartItem,
  mockCheckoutApi,
  seedCart,
} from "./fixtures/checkout";

async function openPopulatedCheckout(page: Page): Promise<void> {
  await seedCart(page);
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Checkout", level: 1 })).toBeVisible();
}

async function fillRequiredCheckoutFields(page: Page): Promise<void> {
  await page.getByLabel("Email").fill("shopper@example.com");
  await page.getByLabel("First name").fill("Asha");
  await page.getByLabel("Last name").fill("Perera");
  await page.getByLabel("Address").fill("42 Cinnamon Lane");
  await page.getByLabel("City").fill("Colombo");
}

test("empty cart directs the shopper back to the catalogue", async ({ page }) => {
  await mockCheckoutApi(page);
  await page.goto("/checkout");

  await expect(page.getByRole("heading", { name: "Your basket is empty", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse the catalogue" })).toHaveAttribute("href", "/products");
});

test("client validation blocks checkout requests until required details are present", async ({ page }) => {
  const api = await mockCheckoutApi(page);
  await openPopulatedCheckout(page);
  const placeOrder = page.getByRole("button", { name: /Place order/ });

  await placeOrder.click();
  await expect(page.getByText("Please enter your email address.")).toBeVisible();
  expect(api.createIntentCalls).toBe(0);

  await page.getByLabel("Email").fill("shopper@example.com");
  await placeOrder.click();
  await expect(page.getByText("Please fill in all required shipping fields.")).toBeVisible();
  expect(api.createIntentCalls).toBe(0);
});

test("successful stub checkout confirms the order and clears the cart", async ({ page }) => {
  const api = await mockCheckoutApi(page);
  await openPopulatedCheckout(page);
  await fillRequiredCheckoutFields(page);

  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page.getByRole("heading", { name: "Confirm test payment" })).toBeVisible();

  expect(api.createIntentCalls).toBe(1);
  expect(api.createIntentBody).toEqual({
    guestEmail: "shopper@example.com",
    shippingAddress: {
      firstName: "Asha",
      lastName: "Perera",
      line1: "42 Cinnamon Lane",
      city: "Colombo",
      country: "US",
    },
    shippingMethod: "STANDARD",
  });

  await page.getByRole("button", { name: "Confirm test payment" }).click();
  await expect(page.getByRole("heading", { name: "Thank you — your spices are on their way" })).toBeVisible();
  await expect(page.getByText(ORDER_ID)).toBeVisible();
  expect(api.stubCompleteBody).toEqual({ orderId: ORDER_ID });
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), CART_KEY)).toBe("[]");
});

test("insufficient stock preserves the cart and lets the shopper retry", async ({ page }) => {
  const message = "Some items are no longer available in the requested quantity.";
  const api = await mockCheckoutApi(page, {
    createIntentError: { status: 409, error: message },
  });
  await openPopulatedCheckout(page);
  await fillRequiredCheckoutFields(page);
  const placeOrder = page.getByRole("button", { name: /Place order/ });

  await placeOrder.click();

  await expect(page.getByText(message)).toBeVisible();
  await expect(placeOrder).toBeEnabled();
  expect(api.createIntentCalls).toBe(1);
  await expect.poll(async () => {
    const value = await page.evaluate((key) => localStorage.getItem(key), CART_KEY);
    return value ? JSON.parse(value) : null;
  }).toEqual([cartItem]);
});
