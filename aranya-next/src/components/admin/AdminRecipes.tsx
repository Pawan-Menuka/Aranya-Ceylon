"use client";

import * as React from "react";
import { RECIPES } from "@/lib/recipes-data";
import { AIcon, Pill, FlagRow } from "./AdminPrimitives";
import {
  listAdminRecipes, getAdminRecipe, createRecipe, updateRecipe, deleteRecipe,
  bestEffort, type AdminRecipe, type AdminRecipeInput,
} from "@/lib/api/admin";
import { DEMO_MODE } from "@/lib/demo";

const COURSES = ["Curries & Mains", "Sweet & Bakes", "Drinks", "Sides & Basics"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];

const TABS = [
  { key: "all", label: "All" },
  { key: "PUBLISHED", label: "Published" },
  { key: "DRAFT", label: "Drafts" },
];

// Seed display rows from static data for the demo / offline state
function staticRows(): AdminRecipe[] {
  return RECIPES.map((r, i) => ({
    id: `demo-${i}`,
    slug: r.slug,
    title: r.title,
    course: r.course,
    difficulty: r.difficulty,
    featured: r.featured ?? false,
    status: "PUBLISHED",
    prepMins: r.time.prep,
    cookMins: r.time.cook,
    serves: r.serves,
    createdAt: new Date().toISOString(),
    dek: r.dek,
    accent: r.accent,
    slot: r.slot,
    intro: r.intro,
    spices: r.spices,
    ingredients: r.ingredients,
    method: r.method,
    tips: r.tips,
  }));
}

function RecipeTable({ rows, onOpen }: { rows: AdminRecipe[]; onOpen: (r: AdminRecipe) => void }) {
  return (
    <div className="ad-card" style={{ overflow: "hidden" }}>
      <table className="ad-table">
        <thead>
          <tr>
            <th>Recipe</th><th>Course</th><th>Difficulty</th>
            <th className="num">Time</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => onOpen(r)}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 380 }}>
                  <span style={{ width: 6, height: 38, borderRadius: 3, background: "var(--brand)", flex: "0 0 auto" }} />
                  <div style={{ lineHeight: 1.35 }}>
                    <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                      {r.featured && <AIcon name="star" size={12} stroke="none" fill="#BA7517" />}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--ad-faint)" }}>/recipes/{r.slug}</div>
                  </div>
                </div>
              </td>
              <td><span className="mkt" style={{ color: "var(--ad-muted)" }}>{r.course}</span></td>
              <td style={{ color: "var(--ad-muted)" }}>{r.difficulty}</td>
              <td className="num tnum" style={{ color: "var(--ad-muted)" }}>
                {r.prepMins + r.cookMins > 0 ? `${r.prepMins + r.cookMins}m` : "—"}
              </td>
              <td><Pill status={r.status.toLowerCase()} /></td>
              <td style={{ textAlign: "right" }}><AIcon name="chevronR" size={16} stroke="var(--ad-faint)" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Draft = Partial<AdminRecipe> & { _isNew?: boolean };
type RecipeSaveInput = Partial<AdminRecipeInput> & Pick<AdminRecipeInput, "title" | "slug" | "course"> & { id?: string };

function RecipeEditor({ recipe, onClose, onSave, onDelete }: {
  recipe: Draft;
  onClose: () => void;
  onSave: (r: RecipeSaveInput) => void | Promise<void>;
  onDelete?: (id: string) => void;
}) {
  const isNew = recipe._isNew ?? !recipe.id;
  const [title, setTitle] = React.useState(recipe.title ?? "");
  const [slug, setSlug] = React.useState(recipe.slug ?? "");
  const [course, setCourse] = React.useState(recipe.course ?? COURSES[0]);
  const [difficulty, setDifficulty] = React.useState(recipe.difficulty ?? "Easy");
  const [prepMins, setPrepMins] = React.useState(String(recipe.prepMins ?? 0));
  const [cookMins, setCookMins] = React.useState(String(recipe.cookMins ?? 0));
  const [serves, setServes] = React.useState(String(recipe.serves ?? 0));
  const [featured, setFeatured] = React.useState(recipe.featured ?? false);
  const [status, setStatus] = React.useState<"DRAFT" | "PUBLISHED">(
    (recipe.status as "DRAFT" | "PUBLISHED") ?? "DRAFT"
  );
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // Auto-slug from title when new
  React.useEffect(() => {
    if (isNew) {
      setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }, [title, isNew]);

  React.useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const handleSave = () => {
    void onSave({
      id: recipe.id,
      title, slug, course, difficulty,
      prepMins: Number(prepMins), cookMins: Number(cookMins),
      serves: Number(serves), featured, status,
      // Existing long-form fields are deliberately omitted from the PATCH.
      // They are not editable in this drawer and must remain untouched.
      ...(isNew ? { dek: title, intro: "" } : {}),
    });
  };

  return (
    <>
      <div className="ad-scrim" onClick={onClose} />
      <aside className="ad-drawer" style={{ width: "min(560px,96vw)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--ad-line)", display: "flex", alignItems: "center", gap: 14, background: "var(--ad-card)" }}>
          <div style={{ flex: 1 }}>
            <div className="ad-eyebrow">{isNew ? "New recipe" : "Edit recipe"}</div>
            <h2 className="disp" style={{ fontSize: 22, color: "var(--ad-ink)", marginTop: 3 }}>{title || "Untitled recipe"}</h2>
          </div>
          <Pill status={status.toLowerCase()} />
          <button className="ad-iconbtn" onClick={onClose}><AIcon name="x" size={17} stroke="var(--ad-muted)" /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ad-field"><label className="ad-label">Title</label>
            <input className="ad-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Recipe title…" />
          </div>

          <div className="ad-field"><label className="ad-label">Slug</label>
            <input className="ad-input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="kebab-case-slug" />
            <span style={{ fontSize: 11.5, color: "var(--ad-faint)", marginTop: 4 }}>/recipes/{slug || "…"}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="ad-field"><label className="ad-label">Course</label>
              <select className="ad-select" value={course} onChange={(e) => setCourse(e.target.value)}>
                {COURSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="ad-field"><label className="ad-label">Difficulty</label>
              <select className="ad-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div className="ad-field"><label className="ad-label">Prep (min)</label>
              <input className="ad-input" type="number" min="0" value={prepMins} onChange={(e) => setPrepMins(e.target.value)} />
            </div>
            <div className="ad-field"><label className="ad-label">Cook (min)</label>
              <input className="ad-input" type="number" min="0" value={cookMins} onChange={(e) => setCookMins(e.target.value)} />
            </div>
            <div className="ad-field"><label className="ad-label">Serves</label>
              <input className="ad-input" type="number" min="0" value={serves} onChange={(e) => setServes(e.target.value)} />
            </div>
          </div>

          <FlagRow label="Feature this recipe" sub="Pin to the recipes hero" value={featured} onChange={setFeatured} />

          <hr className="ad-hr" />

          <div>
            <div className="ad-label" style={{ marginBottom: 10 }}>Status</div>
            <div className="ad-seg" style={{ width: "100%" }}>
              <button className={status === "DRAFT" ? "on" : ""} style={{ flex: 1 }} onClick={() => setStatus("DRAFT")}>Save draft</button>
              <button className={status === "PUBLISHED" ? "on" : ""} style={{ flex: 1 }} onClick={() => setStatus("PUBLISHED")}>Publish</button>
            </div>
          </div>

          {!isNew && (
            <div style={{ marginTop: 8, padding: "14px 16px", background: "rgba(200,40,40,.06)", borderRadius: 10, border: "1px solid rgba(200,40,40,.14)" }}>
              <div style={{ fontSize: 13, color: "var(--ad-muted)", marginBottom: 10 }}>
                Deleting removes the recipe from the public site immediately.
              </div>
              {confirmDelete ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => recipe.id && onDelete?.(recipe.id)}>
                    <AIcon name="trash" size={14} stroke="var(--neg)" />Confirm delete
                  </button>
                  <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
                </div>
              ) : (
                <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setConfirmDelete(true)}>
                  <AIcon name="trash" size={14} stroke="var(--neg)" />Delete recipe
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--ad-line)", display: "flex", gap: 10, background: "var(--ad-card)" }}>
          <button className="ad-btn ad-btn-ghost" style={{ marginLeft: "auto" }} onClick={onClose}>Cancel</button>
          <button className="ad-btn ad-btn-green" onClick={handleSave}>
            <AIcon name="check" size={16} stroke="#fff" />{status === "PUBLISHED" ? "Publish" : "Save draft"}
          </button>
        </div>
      </aside>
    </>
  );
}

export function AdminRecipes() {
  // Demo rows only in demo mode (BUG-20).
  const [rows, setRows] = React.useState<AdminRecipe[]>(() => DEMO_MODE ? staticRows() : []);
  const [loadState, setLoadState] = React.useState<"loading" | "loaded" | "failed">("loading");
  const [tab, setTab] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [edit, setEdit] = React.useState<Draft | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    listAdminRecipes().then(({ recipes }) => {
      setRows(recipes ?? []); setLoadState("loaded"); // live responded — real data authoritative
    }).catch(() => { setLoadState("failed"); });
  }, []);

  const filtered = React.useMemo(() => rows.filter((r) => {
    if (tab !== "all" && r.status !== tab) return false;
    if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, tab, q]);

  const counts = React.useMemo(() => ({
    all: rows.length,
    PUBLISHED: rows.filter((r) => r.status === "PUBLISHED").length,
    DRAFT: rows.filter((r) => r.status === "DRAFT").length,
  }), [rows]);

  const openRecipe = async (recipe: AdminRecipe) => {
    setMessage(null);
    if (recipe.id.startsWith("demo-")) {
      setEdit(recipe);
      return;
    }
    setMessage("Loading full recipe details…");
    try {
      const { recipe: detail } = await getAdminRecipe(recipe.id);
      setEdit(detail);
      setMessage(null);
    } catch {
      setMessage("Could not load the full recipe. Editing is blocked to protect its existing content.");
    }
  };

  const save = async (input: RecipeSaveInput) => {
    const { id, ...body } = input;
    setMessage(null);
    if (!id && loadState === "loading") {
      setMessage("Please wait for the recipe list to finish loading before creating a recipe.");
      return;
    }
    try {
      if (id && !id.startsWith("demo-")) {
        const { recipe } = await updateRecipe(id, body);
        setRows((prev) => prev.map((r) => r.id === id ? recipe : r));
      } else if (id?.startsWith("demo-") || (DEMO_MODE && loadState === "failed")) {
        const newRow: AdminRecipe = {
          id: id ?? `local-${Date.now()}`, slug: body.slug, title: body.title,
          course: body.course, difficulty: body.difficulty ?? "Easy",
          featured: body.featured ?? false, status: body.status ?? "DRAFT",
          prepMins: body.prepMins ?? 0, cookMins: body.cookMins ?? 0,
          serves: body.serves ?? 0, createdAt: new Date().toISOString(),
          dek: body.dek ?? body.title, intro: body.intro ?? "",
        };
        setRows((prev) => id ? prev.map((r) => r.id === id ? newRow : r) : [newRow, ...prev]);
      } else {
        const createBody: AdminRecipeInput = { ...body, dek: body.dek ?? body.title };
        const { recipe } = await createRecipe(createBody);
        setRows((prev) => [recipe, ...prev.filter((r) => !r.id.startsWith("demo-"))]);
      }
      setEdit(null);
    } catch {
      setMessage("The recipe could not be saved. No local success state was applied.");
    }
  };

  const remove = (id: string) => {
    if (!id.startsWith("demo-")) bestEffort(deleteRecipe(id));
    setRows((prev) => prev.filter((r) => r.id !== id));
    setEdit(null);
  };

  return (
    <div>
      <div className="ad-pagehd">
        <div>
          <div className="ad-eyebrow">Content</div>
          <h1 className="ad-title" style={{ marginTop: 6 }}>Recipes</h1>
          <p className="ad-sub">{counts.PUBLISHED} published · {counts.DRAFT} draft{counts.DRAFT !== 1 ? "s" : ""}</p>
        </div>
        <button className="ad-btn ad-btn-amber" disabled={loadState === "loading"} title={loadState === "loading" ? "Waiting for recipes to load" : undefined} onClick={() => setEdit({ _isNew: true })}>
          <AIcon name="plus" size={16} stroke="#fff" />New recipe
        </button>
      </div>

      {message && <div role="status" style={{ marginBottom: 16, padding: "10px 14px", border: "1px solid var(--ad-line)", borderRadius: 10, color: "var(--ad-muted)", background: "var(--ad-card)" }}>{message}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div className="ad-seg">
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
              {t.label}<span style={{ marginLeft: 6, opacity: 0.55 }}>{counts[t.key as keyof typeof counts]}</span>
            </button>
          ))}
        </div>
        <div className="ad-search" style={{ marginLeft: "auto", width: 240 }}>
          <AIcon name="search" size={15} stroke="var(--ad-faint)" />
          <input placeholder="Search recipes…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <RecipeTable rows={filtered} onOpen={(r) => { void openRecipe(r); }} />
      {edit && (
        <RecipeEditor
          recipe={edit}
          onClose={() => setEdit(null)}
          onSave={save}
          onDelete={remove}
        />
      )}
    </div>
  );
}
