import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Story — Aranya Ceylon",
  description:
    "A small house of spice from the hill forests of Sri Lanka — peeled, dried and milled by hand, traced to named estates, and shipped at the height of aroma.",
  openGraph: {
    title: "Our Story — Aranya Ceylon",
    description: "A small house of spice from the hill forests of Sri Lanka.",
    type: "website",
  },
};

// Ported from the prototype's about.jsx (Hero · Statement · Origin · Growers).
// Photo slots render as the tinted placeholder blocks used across the site
// until real estate photography lands.
export default function AboutPage() {
  return (
    <div>
      {/* Hero — near-black editorial */}
      <header
        style={{
          position: "relative",
          minHeight: "62vh",
          background: "#161412",
          color: "#FDFAF5",
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(150deg, rgba(15,110,86,.34), rgba(11,16,13,.6))",
          }}
        />
        <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "120px 40px 80px", width: "100%" }}>
          <span className="eyebrow" style={{ color: "rgba(230,184,96,.9)" }}>
            Our Story
          </span>
          <h1
            className="disp"
            style={{ fontSize: "clamp(48px,7vw,104px)", lineHeight: 0.98, margin: "20px 0 0", fontWeight: 600, letterSpacing: ".005em", maxWidth: 1000 }}
          >
            Spice, as the
            <br />
            <span style={{ fontStyle: "italic", color: "#E6B860" }}>forest</span> intended.
          </h1>
          <p className="prose" style={{ fontSize: "clamp(17px,1.5vw,21px)", color: "rgba(253,250,245,.84)", margin: "26px 0 0", maxWidth: 560 }}>
            We are a small house of spice from the hill forests of Sri Lanka — peeling, drying and milling by hand, and
            shipping at the height of aroma rather than the convenience of a warehouse.
          </p>
        </div>
      </header>

      {/* Statement band */}
      <section style={{ background: "var(--bg)", padding: "100px 0 88px" }}>
        <div style={{ maxWidth: 940, margin: "0 auto", padding: "0 40px", textAlign: "center" }}>
          <p
            className="disp"
            style={{ fontSize: "clamp(28px,3.4vw,44px)", lineHeight: 1.28, color: "var(--ink)", margin: 0, fontWeight: 500, letterSpacing: ".005em" }}
          >
            Most spice is grown to be stored. <span style={{ color: "var(--brand)" }}>Ours is grown to be smelled</span> —
            picked on its own clock, cured in the shade, and sent to you while the oils are still loud.
          </p>
          <p className="prose" style={{ fontSize: 17.5, color: "var(--muted)", margin: "34px auto 0", maxWidth: 600 }}>
            Aranya began with a simple frustration: the cinnamon, cardamom and pepper sold the world over bore little
            resemblance to what grew on the hillsides we knew. Bulked, blended, and years from the tree, they had lost the
            thing that made them worth growing. So we went back to the forest.
          </p>
        </div>
      </section>

      {/* Origin story */}
      <section style={{ background: "var(--bg)", padding: "20px 0 100px" }}>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "0 40px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 72,
            alignItems: "center",
          }}
        >
          <div
            aria-hidden
            style={{
              borderRadius: 10,
              aspectRatio: "4 / 5",
              background: "linear-gradient(160deg, rgba(15,110,86,.22), rgba(11,16,13,.4))",
              boxShadow: "var(--shadow-lg)",
            }}
          />
          <div>
            <span className="eyebrow" style={{ color: "var(--accent)" }}>
              How it began
            </span>
            <h2 className="disp" style={{ fontSize: "clamp(34px,3.6vw,48px)", color: "var(--brand)", margin: "16px 0 24px", lineHeight: 1.05 }}>
              A walk back into the hill country
            </h2>
            <div className="prose" style={{ fontSize: 17.5, color: "var(--ink)", display: "flex", flexDirection: "column", gap: 18 }}>
              <p style={{ margin: 0 }}>
                The first quills we ever sold came from a single family&apos;s plot above Matale — bark peeled in long,
                supple ribbons and rolled by hand the way it had been for generations. They snapped clean, dissolved to
                silk, and smelled of honey and citrus rather than the blunt heat most of us had come to accept as cinnamon.
              </p>
              <p style={{ margin: 0 }}>
                We realised the difference was not a secret recipe but a chain of small, unhurried decisions — which plant
                to pick, which day to peel, how long to let the sun do its work. Keep that chain intact and the spice
                arrives extraordinary. Break it for scale and speed, and you get the jar everyone settles for.
              </p>
              <p style={{ margin: 0 }}>
                Aranya is our attempt to keep the chain intact, and to pay the people who hold it what their craft is worth.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 30 }}>
              <span style={{ width: 46, height: 1, background: "var(--gold-line)" }} />
              <span style={{ fontFamily: "var(--font-display), serif", fontStyle: "italic", fontSize: 22, color: "var(--muted)" }}>
                The Aranya family
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Growers */}
      <section style={{ background: "var(--brand)", color: "#FDFAF5", padding: "100px 0", position: "relative", overflow: "hidden" }}>
        <div
          aria-hidden
          style={{ position: "absolute", inset: 0, background: "radial-gradient(110% 80% at 12% 0%, rgba(29,158,117,.4), transparent 55%)" }}
        />
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px", position: "relative" }}>
          <div style={{ maxWidth: 680 }}>
            <span className="eyebrow" style={{ color: "rgba(230,184,96,.9)" }}>
              The growers
            </span>
            <h2 className="disp" style={{ fontSize: "clamp(34px,3.8vw,52px)", margin: "16px 0 22px", lineHeight: 1.05, fontWeight: 600 }}>
              We buy from the hands that grow it
            </h2>
            <p className="prose" style={{ fontSize: 18, color: "rgba(253,250,245,.84)", margin: 0 }}>
              No brokers, no anonymous lots. Every spice we sell is traced to a named estate or smallholding, bought at a
              price set with the grower rather than against them. We visit at harvest, taste at the source, and carry only
              what we would keep for our own kitchen — which means we leave most of what we are offered behind.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 24,
              marginTop: 56,
            }}
          >
            {GROWERS.map(({ place, role }) => (
              <figure key={place} style={{ margin: 0 }}>
                <div
                  style={{
                    position: "relative",
                    borderRadius: 10,
                    overflow: "hidden",
                    aspectRatio: "3 / 4",
                    background: "linear-gradient(180deg, rgba(29,158,117,.28), rgba(11,16,13,.7))",
                    boxShadow: "0 24px 50px rgba(0,0,0,.3)",
                  }}
                >
                  <figcaption style={{ position: "absolute", left: 18, bottom: 16 }}>
                    <div className="disp" style={{ fontSize: 24, color: "#fff", lineHeight: 1 }}>
                      {place}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-ui), sans-serif",
                        fontSize: 12,
                        letterSpacing: ".06em",
                        color: "#E6B860",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        marginTop: 6,
                      }}
                    >
                      {role}
                    </div>
                  </figcaption>
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const GROWERS = [
  { place: "Matale Hills", role: "Cinnamon peelers" },
  { place: "Kandy District", role: "Cardamom pickers" },
  { place: "Southern Province", role: "Turmeric curers" },
];
