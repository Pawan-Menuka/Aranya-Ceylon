"use client";

import * as React from "react";
import Link from "next/link";
import type { Spice, Market } from "@/lib/types";
import { Liyawel, Eyebrow } from "../primitives/Motif";
import { Stars } from "../primitives/Stars";
import { Icon } from "../primitives/Icon";
import { CardCFinal } from "../cards/Cards";
import { pdContent, PD_REVIEWS } from "@/lib/pd-content";
import { sanitizeHtml } from "@/lib/sanitize";
import { DEMO_MODE } from "@/lib/demo";

// Product-detail editorial sections (ported from product-detail-2.jsx):
// ForestStory · FlavourProfile · Pairings · ReviewsBlock · Related.

export function ForestStory({ spice }: { spice: Spice }) {
  const c = pdContent(spice);
  return (
    <section style={{ background: "var(--bg)", padding: "96px 0 40px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px" }}>
        <Liyawel width={220} style={{ marginBottom: 34 }} />
        <Eyebrow center color="var(--accent)">From the forest</Eyebrow>
        <h2 className="disp" style={{ fontSize: 44, color: "var(--brand)", textAlign: "center", margin: "18px 0 52px", lineHeight: 1.06 }}>{c.storyTitle}</h2>
        <div className="pd-two" style={{ alignItems: "start", maxWidth: 980, margin: "0 auto" }}>
          {c.story.map((p, i) => (
            <p key={i} className="prose" style={{ fontSize: 17.5, color: "var(--ink)", margin: 0 }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(p) }} />
          ))}
        </div>
        <figure style={{ maxWidth: 760, margin: "60px auto 0", textAlign: "center" }}>
          <blockquote className="disp" style={{ fontSize: 30, fontStyle: "italic", color: "var(--brand)", lineHeight: 1.3, margin: 0, fontWeight: 500 }}>
            &ldquo;{c.quote}&rdquo;
          </blockquote>
          <figcaption style={{ fontFamily: "var(--font-ui)", fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, marginTop: 18 }}>
            — {c.quoteBy}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

// Map backend certification codes to display labels; non-cert badges
// (BESTSELLER/NEW/…) map to nothing and are dropped.
const CERT_LABELS: Record<string, string> = {
  CEYLON_GI: "GI Protected",
  ORGANIC: "Organic",
  EU_ORGANIC: "EU Organic",
  USDA_ORGANIC: "USDA Organic",
  FAIR_TRADE: "Fair Trade",
};
function formatCerts(codes: string[] | undefined): string {
  return (codes ?? []).map((c) => CERT_LABELS[c]).filter(Boolean).join(" · ");
}

export function FlavourProfile({ spice }: { spice: Spice }) {
  const c = pdContent(spice);
  // Replace the editorial certification claim (e.g. "Organic (EU/USDA)") with the
  // product's REAL certifications, and drop the row entirely when it has none —
  // never assert a certification the product doesn't hold (BUG-20).
  const realCerts = formatCerts(spice.certifications);
  const specs = c.specs
    .map(([k, v]): [string, string] => (k === "Certification" ? [k, realCerts] : [k, v]))
    .filter(([k, v]) => !(k === "Certification" && !v));
  return (
    <section style={{ background: "var(--surface)", padding: "84px 0" }}>
      <div className="pd-two" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px", alignItems: "start" }}>
        <div>
          <Eyebrow color="var(--accent)">Flavour profile</Eyebrow>
          <h3 className="disp" style={{ fontSize: 32, color: "var(--ink)", margin: "14px 0 30px", lineHeight: 1.1 }}>How it tastes</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {c.flavour.map(([label, val]) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{label}</span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "var(--muted)" }}>{val}</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: "rgba(26,26,26,.06)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: val + "%", borderRadius: 999, background: `linear-gradient(90deg, ${spice.base}, ${spice.color})` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Eyebrow color="var(--accent)">Specifications</Eyebrow>
          <h3 className="disp" style={{ fontSize: 32, color: "var(--ink)", margin: "14px 0 30px", lineHeight: 1.1 }}>The details</h3>
          <dl style={{ margin: 0 }}>
            {specs.map(([k, v], i) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "baseline", padding: "13px 0", borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                <dt style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", flex: "0 0 auto" }}>{k}</dt>
                <dd style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: 0, textAlign: "right" }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export function Pairings({ spice }: { spice: Spice }) {
  const c = pdContent(spice);
  return (
    <section style={{ background: "var(--bg)", padding: "84px 0" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <Eyebrow center color="var(--accent)">In the kitchen</Eyebrow>
          <h2 className="disp" style={{ fontSize: 40, color: "var(--brand)", margin: "16px 0 24px", lineHeight: 1.06 }}>Ways to use it</h2>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 9, maxWidth: 640, margin: "0 auto" }}>
            {c.pairings.map((p) => (
              <span key={p} style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--brand)", border: "1px solid var(--line)", background: "#fff", borderRadius: 999, padding: "8px 15px" }}>{p}</span>
            ))}
          </div>
        </div>
        <div className="pd-three">
          {c.uses.map(([title, body], i) => (
            <div key={title} style={{ background: "var(--surface)", borderRadius: 8, padding: "28px 26px", borderTop: `4px solid ${spice.color}` }}>
              <div className="disp" style={{ fontSize: 26, color: "rgba(26,26,26,.14)", fontWeight: 600, lineHeight: 1, marginBottom: 12 }}>0{i + 1}</div>
              <h4 className="disp" style={{ fontSize: 23, color: "var(--ink)", margin: "0 0 10px", lineHeight: 1.1 }}>{title}</h4>
              <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ReviewsBlock({ spice }: { spice: Spice }) {
  // Prefer real, approved reviews. Fabricated demo cards render ONLY in demo
  // mode — never presented as genuine on a live product (BUG-20).
  const real = spice.reviewItems ?? [];
  const hasReal = real.length > 0;
  const showDemo = !hasReal && DEMO_MODE;
  const cards = hasReal
    ? real.map((r) => ({ name: r.user?.name ?? "Verified buyer", loc: "", rating: r.rating, title: r.title, body: r.body }))
    : (showDemo ? PD_REVIEWS : []);

  // Star distribution: computed from the real reviews when present; static demo
  // figures only in demo mode; otherwise zeros.
  const dist: [number, number][] = hasReal
    ? ([5, 4, 3, 2, 1] as const).map((star) => {
        const n = real.filter((r) => Math.round(r.rating) === star).length;
        return [star, Math.round((n / real.length) * 100)];
      })
    : showDemo
      ? [[5, 78], [4, 16], [3, 4], [2, 1], [1, 1]]
      : [[5, 0], [4, 0], [3, 0], [2, 0], [1, 0]];
  return (
    <section id="reviews" style={{ background: "var(--surface)", padding: "84px 0" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px" }}>
        <Eyebrow color="var(--accent)">What people say</Eyebrow>
        <h2 className="disp" style={{ fontSize: 40, color: "var(--brand)", margin: "16px 0 40px", lineHeight: 1.06 }}>{spice.reviews} reviews</h2>
        <div className="pd-reviews">
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
              <span className="disp" style={{ fontSize: 64, color: "var(--ink)", fontWeight: 600, lineHeight: 1 }}>{spice.rating}</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", fontWeight: 600 }}>/ 5</span>
            </div>
            <Stars rating={spice.rating} showNum={false} size={18} />
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", marginTop: 12 }}>Based on {spice.reviews} verified buyers</div>
            <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 8 }}>
              {dist.map(([star, pct]) => (
                <div key={star} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "var(--muted)", width: 30 }}>{star} ★</span>
                  <div style={{ flex: 1, height: 7, borderRadius: 999, background: "rgba(26,26,26,.07)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: pct + "%", background: "var(--accent)", borderRadius: 999 }} />
                  </div>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", width: 32, textAlign: "right" }}>{pct}%</span>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost" style={{ marginTop: 24 }}>Write a review</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {cards.length === 0 && (
              <div style={{ background: "#FFFDF9", border: "1px solid var(--line)", borderRadius: 8, padding: "40px 26px", textAlign: "center" }}>
                <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: 0 }}>No reviews yet — be the first to share your thoughts.</p>
              </div>
            )}
            {cards.map((r, i) => (
              <div key={i} style={{ background: "#FFFDF9", border: "1px solid var(--line)", borderRadius: 8, padding: "24px 26px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{r.name}</span>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--brand)", background: "rgba(15,110,86,.08)", padding: "3px 7px", borderRadius: 4 }}>Verified</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)" }}>{r.loc}</span>
                  </div>
                  <Stars rating={r.rating} showNum={false} size={14} />
                </div>
                <h4 className="disp" style={{ fontSize: 21, color: "var(--ink)", margin: "0 0 6px", lineHeight: 1.15 }}>{r.title}</h4>
                <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: 0 }}>{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Related({ spices, market }: { spices: Spice[]; market: Market }) {
  if (!spices.length) return null;
  return (
    <section style={{ background: "var(--bg)", padding: "84px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 34 }}>
          <div>
            <Eyebrow color="var(--accent)">More from the hill country</Eyebrow>
            <h2 className="disp" style={{ fontSize: 38, color: "var(--brand)", margin: "14px 0 0", lineHeight: 1.04 }}>Pairs well with</h2>
          </div>
          <Link href="/products" style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, color: "var(--brand)", display: "inline-flex", alignItems: "center", gap: 6, paddingBottom: 6 }}>
            Shop all spices <Icon name="chevron" size={14} stroke="var(--brand)" />
          </Link>
        </div>
        <div className="cat-grid">
          {spices.slice(0, 4).map((s) => <CardCFinal key={s.name} spice={s} market={market} />)}
        </div>
      </div>
    </section>
  );
}
