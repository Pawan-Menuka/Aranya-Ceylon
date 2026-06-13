import { getMarket } from "@/lib/market";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { I18nProvider } from "@/components/I18nProvider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/components/CartProvider";
import { SessionProvider } from "@/components/SessionProvider";

// Storefront shell — navbar (market switcher + account + cart) + footer around
// all public shop routes. Reading the market/locale cookies makes these routes
// dynamic. The resolved dictionary seeds both server chrome and client islands.
export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [market, locale] = await Promise.all([getMarket(), getLocale()]);
  const dict = getDictionary(locale);
  return (
    <I18nProvider dict={dict} locale={locale}>
      <SessionProvider>
        <CartProvider>
          <Navbar market={market} dict={dict} locale={locale} />
          <div style={{ minHeight: "60vh" }}>{children}</div>
          <Footer market={market} />
        </CartProvider>
      </SessionProvider>
    </I18nProvider>
  );
}
