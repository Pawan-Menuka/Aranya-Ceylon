import { getMarket } from "@/lib/market";
import { CheckoutForm } from "@/components/CheckoutForm";

export const metadata = { title: "Checkout — Aranya Ceylon" };

export default async function CheckoutPage() {
  const market = await getMarket();
  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px 80px" }}>
      <p className="eyebrow" style={{ color: "var(--accent)" }}>Almost there</p>
      <h1 className="disp" style={{ fontSize: "clamp(32px,4.5vw,46px)", margin: "6px 0 28px" }}>Checkout</h1>
      <CheckoutForm market={market} />
    </main>
  );
}
