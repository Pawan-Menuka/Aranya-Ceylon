import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

// Phase 0a placeholder landing. The real scroll-frame hero homepage is a later
// phase; this confirms the scaffold, fonts, and design tokens render correctly.
export default async function HomePage() {
  const dict = getDictionary(await getLocale());
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--ink)",
        color: "#FDFAF5",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <div style={{ width: 44, height: 1.5, background: "var(--accent)", marginBottom: 26 }} />
      <h1
        className="disp"
        style={{ fontSize: "clamp(48px,7vw,92px)", letterSpacing: ".14em", lineHeight: 1, margin: 0 }}
      >
        ARANYA
      </h1>
      <p
        className="disp"
        style={{
          fontStyle: "italic",
          fontSize: "clamp(16px,2.2vw,24px)",
          color: "var(--accent)",
          letterSpacing: ".34em",
          marginTop: 16,
        }}
      >
        CEYLON
      </p>
      <p style={{ marginTop: 22, fontSize: 13, letterSpacing: ".04em", color: "rgba(253,250,245,.7)" }}>
        {dict.home.tagline}
      </p>

      <Link
        href="/products"
        className="btn btn-intl"
        style={{ marginTop: 40, display: "inline-block", textDecoration: "none" }}
      >
        {dict.home.cta}
      </Link>
    </main>
  );
}
