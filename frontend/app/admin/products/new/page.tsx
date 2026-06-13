import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div>
      <nav style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
        <Link href="/admin/products" style={{ color: "var(--muted)" }}>Products</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span>New</span>
      </nav>
      <h1 className="disp" style={{ fontSize: "clamp(26px,3vw,38px)", margin: "0 0 20px", color: "var(--ink)" }}>
        New product
      </h1>
      <ProductForm />
    </div>
  );
}
