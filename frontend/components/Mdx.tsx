import { compileMDX } from "next-mdx-remote/rsc";
import type { ReactElement } from "react";

// Styled element map so DB/file MDX renders in the Aranya editorial voice
// (Spectral `.prose` for body, Cormorant for headings). Kept deliberately small
// — long-form content only needs headings, paragraphs, quotes, lists, links.
export const mdxComponents = {
  h2: (p: Record<string, unknown>) => (
    <h2
      className="disp"
      style={{ fontSize: "clamp(26px,3vw,34px)", lineHeight: 1.15, margin: "44px 0 14px", color: "var(--ink)" }}
      {...p}
    />
  ),
  h3: (p: Record<string, unknown>) => (
    <h3 className="disp" style={{ fontSize: 24, margin: "32px 0 10px", color: "var(--ink)" }} {...p} />
  ),
  p: (p: Record<string, unknown>) => (
    <p className="prose" style={{ fontSize: 18, lineHeight: 1.7, color: "var(--ink)", margin: "0 0 20px" }} {...p} />
  ),
  blockquote: (p: Record<string, unknown>) => (
    <blockquote
      className="prose"
      style={{
        fontSize: 24,
        fontStyle: "italic",
        lineHeight: 1.4,
        color: "var(--brand)",
        borderLeft: "3px solid var(--brand)",
        padding: "4px 0 4px 24px",
        margin: "32px 0",
      }}
      {...p}
    />
  ),
  ul: (p: Record<string, unknown>) => (
    <ul className="prose" style={{ fontSize: 18, lineHeight: 1.7, color: "var(--ink)", margin: "0 0 20px", paddingLeft: 24 }} {...p} />
  ),
  ol: (p: Record<string, unknown>) => (
    <ol className="prose" style={{ fontSize: 18, lineHeight: 1.7, color: "var(--ink)", margin: "0 0 20px", paddingLeft: 24 }} {...p} />
  ),
  li: (p: Record<string, unknown>) => <li style={{ margin: "0 0 8px" }} {...p} />,
  a: (p: Record<string, unknown>) => <a style={{ color: "var(--brand)", textDecoration: "underline" }} {...p} />,
};

// Renders an MDX/markdown string. On a compile error (malformed authored
// content) it degrades to the raw text rather than throwing the whole page.
export async function Mdx({ source }: { source: string }): Promise<ReactElement> {
  try {
    const { content } = await compileMDX({
      source,
      components: mdxComponents,
      options: { parseFrontmatter: false },
    });
    return <>{content}</>;
  } catch (err) {
    console.warn("[mdx] compile failed, rendering as plain text:", (err as Error).message);
    return (
      <>
        {source.split(/\n{2,}/).map((para, i) => (
          <p key={i} className="prose" style={{ fontSize: 18, lineHeight: 1.7, color: "var(--ink)", margin: "0 0 20px" }}>
            {para}
          </p>
        ))}
      </>
    );
  }
}
