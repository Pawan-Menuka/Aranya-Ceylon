import { getMarket } from "@/lib/market";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

// Storefront shell — navbar (with market switcher) + footer around all
// public shop routes. Reading the market cookie makes these routes dynamic.
export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const market = await getMarket();
  return (
    <>
      <Navbar market={market} />
      <div style={{ minHeight: "60vh" }}>{children}</div>
      <Footer />
    </>
  );
}
