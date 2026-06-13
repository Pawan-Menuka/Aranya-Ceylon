"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { AdminProduct } from "@/lib/api/admin-types";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "var(--brand)",
  DRAFT: "var(--accent)",
  ARCHIVED: "var(--muted)",
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/admin/products", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { products: AdminProduct[] };
      setProducts(data.products ?? []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const archive = async (id: string, name: string) => {
    if (!confirm(`Archive “${name}”? It will be hidden from the storefront.`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      alert("Couldn’t archive that product.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 className="disp" style={{ fontSize: "clamp(28px,3vw,40px)", margin: 0, color: "var(--ink)" }}>
          Products
        </h1>
        <Link href="/admin/products/new" className="btn btn-intl" style={{ textDecoration: "none" }}>
          New product
        </Link>
      </div>

      {state === "loading" && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      {state === "error" && <p style={{ color: "#B23B3B" }}>Couldn’t load products.</p>}
      {state === "ready" && products.length === 0 && <p style={{ color: "var(--muted)" }}>No products yet. Create your first one.</p>}

      {state === "ready" && products.length > 0 && (
        <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-ui), sans-serif", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--surface)", textAlign: "left" }}>
                <Th>Product</Th>
                <Th>Category</Th>
                <Th>Variants</Th>
                <Th>Stock</Th>
                <Th>Status</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const stock = p.variants.reduce((sum, v) => sum + v.stock, 0);
                return (
                  <tr key={p.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <Td>
                      <Link href={`/admin/products/${p.id}`} style={{ color: "var(--brand)", fontWeight: 600, textDecoration: "none" }}>
                        {p.name}
                      </Link>
                      {p.featured && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>★ Featured</span>}
                      <div style={{ color: "var(--muted)", fontSize: 12.5 }}>/{p.slug}</div>
                    </Td>
                    <Td style={{ color: "var(--muted)" }}>{p.category?.name ?? "—"}</Td>
                    <Td>{p.variants.length}</Td>
                    <Td style={{ color: stock === 0 ? "#B23B3B" : "var(--ink)" }}>{stock}</Td>
                    <Td>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: ".04em",
                          textTransform: "uppercase",
                          color: STATUS_COLOR[p.status] ?? "var(--muted)",
                          border: `1px solid ${STATUS_COLOR[p.status] ?? "var(--line)"}`,
                          borderRadius: 999,
                          padding: "3px 10px",
                        }}
                      >
                        {p.status}
                      </span>
                    </Td>
                    <Td>
                      {p.status !== "ARCHIVED" && (
                        <button
                          onClick={() => archive(p.id, p.name)}
                          disabled={busy === p.id}
                          style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 13, fontWeight: 600, color: "#B23B3B", background: "transparent", border: "none", cursor: "pointer" }}
                        >
                          {busy === p.id ? "…" : "Archive"}
                        </button>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>{children}</th>;
}
function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "12px 16px", ...style }}>{children}</td>;
}
