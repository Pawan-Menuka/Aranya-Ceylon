import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getProducts } from "@/lib/api/products";
import { HomeHero } from "@/components/home/HomeHero";
import { CategoryTiles, StoryBand, Heritage } from "@/components/home/Sections";
import { Newsletter } from "@/components/home/Newsletter";
import { ProductCard } from "@/components/ProductCard";
import { Eyebrow, Icon } from "@/components/design/Primitives";

// Homepage (see frontend/DESIGN.md): Hero → What People Love → Browse by
// Category → Story band → Heritage → Newsletter → Footer (from the layout).
export default async function HomePage() {
  const dict = getDictionary(await getLocale());
  const { items } = await getProducts({ limit: 8 });
  const picks = items.slice(0, 4);

  return (
    <>
      <HomeHero dict={dict} />

      {/* What People Love */}
      {picks.length > 0 && (
        <section style={{ background: "var(--bg)", padding: "100px 0" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 44, flexWrap: "wrap", gap: 16 }}>
              <div>
                <Eyebrow>Loved by Our Kitchen Community</Eyebrow>
                <h2 className="disp" style={{ fontSize: "clamp(34px,5vw,50px)", color: "var(--brand)", margin: "14px 0 0", lineHeight: 1.03 }}>
                  What People Love
                </h2>
              </div>
              <Link href="/products" style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 14, fontWeight: 700, color: "var(--brand)", display: "inline-flex", alignItems: "center", gap: 7 }}>
                Shop all spices <Icon name="chevron" size={15} stroke="var(--brand)" />
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 22 }}>
              {picks.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <CategoryTiles />
      <StoryBand />
      <Heritage />
      <Newsletter />
    </>
  );
}
