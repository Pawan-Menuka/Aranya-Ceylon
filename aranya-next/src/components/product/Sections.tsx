"use client";
import * as React from "react";
import Link from "next/link";
import type { Spice, Market } from "@/lib/types";
import { Eyebrow } from "../primitives/Motif";
import { Icon } from "../primitives/Icon";
import { CardCFinal } from "../cards/Cards";
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
