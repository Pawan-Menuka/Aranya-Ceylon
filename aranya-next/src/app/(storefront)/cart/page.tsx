import { redirect } from "next/navigation";

// The cart is a slide-in drawer (the locked design), not a standalone page.
// A direct /cart URL lands on the catalog with the drawer opened (?cart=1,
// which CartProvider reads on mount).
export default function CartPage() {
  redirect("/products?cart=1");
}
