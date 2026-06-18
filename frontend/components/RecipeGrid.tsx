"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { RecipeMetaWithSlug } from "@/lib/recipes";

// Course chips + filtered recipe grid. The full list is server-rendered into
// this client island; filtering is in-memory so switching courses never
// refetches or hits the network.
export function RecipeGrid({
  recipes,
  courses,
}: {
  recipes: RecipeMetaWithSlug[];
  courses: string[];
}) {
  const [course, setCourse] = useState("All");
  const grid = useMemo(
    () => (course === "All" ? recipes : recipes.filter((r) => r.course === course)),
    [course, recipes],
  );

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center", marginBottom: 44 }}>
        {courses.map((c) => {
          const on = course === c;
          return (
            <button
              key={c}
              onClick={() => setCourse(c)}
              style={{
                fontFamily: "var(--font-ui), sans-serif",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer",
                padding: "9px 18px",
                borderRadius: 999,
                transition: "all .15s",
                border: on ? "1px solid var(--brand)" : "1px solid var(--line)",
                background: on ? "var(--brand)" : "#fff",
                color: on ? "#fff" : "var(--ink)",
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      {grid.length === 0 ? (
        <div style={{ textAlign: "center", padding: "70px 0" }}>
          <h3 className="disp" style={{ fontSize: 28, color: "var(--ink)", margin: 0 }}>
            No recipes in {course} yet
          </h3>
          <p style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 15, color: "var(--muted)", marginTop: 8 }}>
            More are simmering away.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 40 }}>
          {grid.map((r) => (
            <RecipeCard key={r.slug} recipe={r} />
          ))}
        </div>
      )}
    </>
  );
}

function RecipeCard({ recipe }: { recipe: RecipeMetaWithSlug }) {
  const total = recipe.prep + recipe.cook;
  return (
    <Link href={`/recipes/${recipe.slug}`} style={{ display: "flex", flexDirection: "column", textDecoration: "none" }}>
      <div
        aria-hidden
        style={{
          aspectRatio: "3 / 2",
          borderRadius: 9,
          background: `linear-gradient(155deg, ${recipe.accent}33, ${recipe.accent}aa)`,
        }}
      />
      <div style={{ paddingTop: 18 }}>
        <span
          style={{
            fontFamily: "var(--font-ui), sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            color: recipe.accent,
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <span style={{ width: 16, height: 1.5, background: recipe.accent }} />
          {recipe.course}
        </span>
        <h3 className="disp" style={{ fontSize: 25, color: "var(--ink)", margin: "12px 0 10px", lineHeight: 1.12 }}>
          {recipe.title}
        </h3>
        <p
          className="prose"
          style={{
            fontSize: 15.5,
            color: "var(--muted)",
            margin: "0 0 16px",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {recipe.dek}
        </p>
        <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 12.5, color: "var(--muted)", fontWeight: 500 }}>
          {total} min{recipe.serves > 0 ? ` · serves ${recipe.serves}` : ""} · {recipe.difficulty}
        </span>
      </div>
    </Link>
  );
}
