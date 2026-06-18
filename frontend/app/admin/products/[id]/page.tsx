"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import type { AdminProduct } from "@/lib/api/admin-types";

// No dedicated admin "get one" endpoint — the admin list returns full products
// (variants/images/category), so we fetch it and pick the one we're editing.
export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "notfound">("loading");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/products", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { products: AdminProduct[] };
        const found = (data.products ?? []).find((p) => p.id === id);
        if (!found) return setState("notfound");
        setProduct(found);
        setState("ready");
      } catch {
        setState("error");
      }
    })();
  }, [id]);

  return (
    <div>
      <nav style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
        <Link href="/admin/products" style={{ color: "var(--muted)" }}>Products</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span>Edit</span>
      </nav>
      <h1 className="disp" style={{ fontSize: "clamp(26px,3vw,38px)", margin: "0 0 20px", color: "var(--ink)" }}>
        {state === "ready" && product ? product.name : "Edit product"}
      </h1>

      {state === "loading" && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      {state === "notfound" && <p style={{ color: "var(--muted)" }}>That product doesn’t exist.</p>}
      {state === "error" && <p style={{ color: "#B23B3B" }}>Couldn’t load this product.</p>}
      {state === "ready" && product && <ProductForm initial={product} />}
    </div>
  );
}
