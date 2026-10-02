import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import type { Post } from "../../aranya-next/src/lib/journal-data";

// Render the real client component with ReactDOM's server renderer, as Next
// prerendering does. Only unrelated primitives and the browser API are mocked.
const frontendRequire = createRequire(new URL("../../aranya-next/package.json", import.meta.url));
const React = frontendRequire("react") as typeof import("react");
const { renderToStaticMarkup } = frontendRequire("react-dom/server") as typeof import("react-dom/server");
const ts = frontendRequire("typescript") as typeof import("typescript");
const listBlog = vi.fn();
const passthrough = ({ children }: { children?: import("react").ReactNode }) => React.createElement(React.Fragment, null, children);
const imports: Record<string, unknown> = {
  react: React,
  "next/link": { default: ({ href, children, ...props }: { href: string; children?: import("react").ReactNode }) => React.createElement("a", { ...props, href }, children) },
  "@/lib/journal-data": { toPost: (post: Post) => post },
  "@/lib/api/blog": { listBlog },
  "../primitives/Reveal": { Reveal: passthrough },
  "../primitives/Motif": { Liyawel: () => null, Eyebrow: passthrough },
  "../primitives/Icon": { Icon: () => null },
  "../primitives/ImageSlot": { ImageSlot: () => null },
};
const source = readFileSync(new URL("../../aranya-next/src/components/journal/JournalClient.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
const componentModule = { exports: {} };
runInNewContext(compiled, {
  module: componentModule,
  exports: componentModule.exports,
  require: (name: string) => {
    if (!(name in imports)) throw new Error(`Unexpected journal import: ${name}`);
    return imports[name];
  },
});
const { JournalClient } = componentModule.exports as {
  JournalClient: (props: { posts: Post[]; initialCursor: string | null }) => import("react").ReactElement;
};
const post = (slug: string, featured = false): Post => ({
  slug, featured, title: `Story ${slug}`, dek: "Forest notes", category: "Sourcing",
  accent: "#237654", slot: "journal-forest", author: "Author", role: "", date: "2026-10-02", readTime: "4 min",
} as Post);
const render = (posts: Post[], initialCursor: string | null = null) => renderToStaticMarkup(React.createElement(JournalClient, { posts, initialCursor }));
const linkCount = (html: string, slug: string) => html.split(`href="/journal/${slug}"`).length - 1;

beforeEach(() => listBlog.mockReset());

describe("journal prerender with legitimate empty API data", () => {
  it("renders the existing empty state without a featured post or API call", () => {
    const html = render([]);
    expect(html).toContain("Notes from the forest");
    expect(html).toContain("No posts in All yet");
    expect(html).toContain("More stories are on the way.");
    expect(html).not.toContain('class="jf-grid"');
    expect(html).not.toContain('href="/journal/');
    expect(html).not.toContain("Load more stories");
    expect(listBlog).not.toHaveBeenCalled();
  });
  it("keeps pagination available for an empty initial page with a next cursor", () => {
    const html = render([], "next-page");
    expect(html).toContain("No posts in All yet");
    expect(html).toContain("Load more stories");
    expect(html).not.toContain('disabled=""');
    expect(listBlog).not.toHaveBeenCalled();
  });
  it("selects a flagged featured post and includes every other post once in the grid", () => {
    const html = render([post("first"), post("spotlight", true), post("last")], "next-page");
    expect(html).toContain('class="jf-grid"');
    expect(html).toContain('class="jg-grid"');
    expect(html.indexOf('href="/journal/spotlight"')).toBeLessThan(html.indexOf('href="/journal/first"'));
    for (const slug of ["first", "spotlight", "last"]) expect(linkCount(html, slug)).toBe(1);
    expect(html).toContain("Load more stories");
    expect(html).toContain("Sourcing");
    expect(listBlog).not.toHaveBeenCalled();
  });
  it("uses the first post as the spotlight when none is marked featured", () => {
    const html = render([post("first"), post("second")]);
    expect(html.indexOf('href="/journal/first"')).toBeLessThan(html.indexOf('href="/journal/second"'));
    expect(linkCount(html, "first")).toBe(1);
    expect(linkCount(html, "second")).toBe(1);
    expect(html).not.toContain("Load more stories");
  });
});
