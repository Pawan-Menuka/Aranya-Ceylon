import { getMarket } from "@/lib/market";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/components/CartProvider";
import { SessionProvider } from "@/components/SessionProvider";

// Storefront shell — navbar (market switcher + account + cart) + footer around
// all public shop routes. Reading the market cookie makes these routes dynamic.
export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const market = await getMarket();
  return (
    <SessionProvider>
      <CartProvider>
        <Navbar market={market} />
        <div style={{ minHeight: "60vh" }}>{children}</div>
        <Footer />
      </CartProvider>
    </SessionProvider>
  );
}
