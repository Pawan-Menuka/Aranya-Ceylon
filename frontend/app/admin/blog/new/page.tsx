import Link from "next/link";
import { BlogForm } from "@/components/admin/BlogForm";

export default function NewBlogPage() {
  return (
    <div>
      <nav style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
        <Link href="/admin/blog" style={{ color: "var(--muted)" }}>Journal posts</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span>New</span>
      </nav>
      <h1 className="disp" style={{ fontSize: "clamp(26px,3vw,38px)", margin: "0 0 20px", color: "var(--ink)" }}>
        New post
      </h1>
      <BlogForm />
    </div>
  );
}
