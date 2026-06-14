import type { Dictionary } from "@/lib/i18n/dictionaries";

export function Footer({ dict }: { dict: Dictionary }) {
  return (
    <footer style={{ background: "var(--brand)", color: "rgba(253,250,245,0.85)", marginTop: 80 }}>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "48px 24px",
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div className="disp" style={{ fontSize: 22, letterSpacing: ".14em", color: "#FDFAF5" }}>
          ARANYA <span style={{ fontStyle: "italic", color: "var(--gold-line)" }}>Ceylon</span>
        </div>
        <p style={{ fontSize: 13, margin: 0 }}>
          {dict.footer.tagline}
        </p>
        <p style={{ fontSize: 12, margin: 0, opacity: 0.7 }}>
          © {new Date().getFullYear()} {dict.footer.rights}
        </p>
      </div>
    </footer>
  );
}
