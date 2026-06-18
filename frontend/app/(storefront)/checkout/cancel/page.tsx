import Link from "next/link";

export const metadata = { title: "Checkout cancelled — Aranya Ceylon" };

export default function CheckoutCancelPage() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
      <h1 className="disp" style={{ fontSize: "clamp(28px,4vw,40px)", margin: "0 0 12px" }}>
        Payment cancelled
      </h1>
      <p className="prose" style={{ fontSize: 17, color: "var(--muted)", margin: "0 0 32px" }}>
        No payment was taken. Your cart is still saved.
      </p>
      <Link href="/cart" className="btn btn-intl" style={{ display: "inline-block" }}>
        Back to cart
      </Link>
    </main>
  );
}
