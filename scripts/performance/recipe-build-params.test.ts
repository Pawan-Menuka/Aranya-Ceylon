import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import * as recipeApi from "../../aranya-next/src/lib/api/recipes";
import { RequestFailure } from "../../aranya-next/src/lib/api/request-deadline";

const api = vi.hoisted(() => vi.fn());
vi.mock("../../aranya-next/src/lib/api/public", () => ({ publicApiFetch: api }));
vi.mock("../../aranya-next/src/lib/demo", () => ({ DEMO_MODE: false }));
// The page uses Next's JSX-preserve compiler setting. Transpile the actual page
// with the existing TypeScript dependency so this Node suite needs no browser,
// Next build, or application-wide JSX configuration change.
const frontendRequire = createRequire(new URL("../../aranya-next/package.json", import.meta.url));
const ts = frontendRequire("typescript") as typeof import("typescript");
const source = readFileSync(new URL("../../aranya-next/src/app/(storefront)/recipes/[slug]/page.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
}).outputText;
const imports: Record<string, unknown> = {
  "@/lib/api/recipes": recipeApi,
  "@/lib/demo": { DEMO_MODE: false },
  "@/lib/market": { resolveMarket: () => "intl" },
  "@/lib/recipes-data": {},
  "@/lib/recipes-demo": { RECIPES: [{ slug: "demo-must-not-be-used" }] },
  "@/lib/api/products": {},
  "@/lib/api/read-failure": {},
  "@/lib/catalog-data": {},
  "@/lib/json-ld": {},
  "next/navigation": {},
  "@/components/SiteChrome": {},
  "@/components/recipes/RecipeDetailClient": {},
};
const pageModule = { exports: {} };
runInNewContext(compiled, {
  module: pageModule,
  exports: pageModule.exports,
  require: (name: string) => {
    if (!(name in imports)) throw new Error(`Unexpected page import: ${name}`);
    return imports[name];
  },
});
const { generateStaticParams, generateMetadata, default: RecipeDetailPage } = pageModule.exports as {
  generateStaticParams: () => Promise<{ slug: string }[]>;
  generateMetadata: (props: { params: { slug: string } }) => Promise<unknown>;
  default: (props: { params: { slug: string } }) => Promise<unknown>;
};

beforeEach(() => { api.mockReset(); });
afterEach(() => { vi.restoreAllMocks(); });

describe("recipe build enumeration without a live API", () => {
  it.each([
    new RequestFailure("Unavailable fixture API", 502, "api_unreachable"),
    new RequestFailure("Timed out fixture API", 504, "request_timeout"),
    Object.assign(new Error("Unavailable fixture service"), { status: 503 }),
  ])("returns no build params for a rejected API read (%s)", async failure => {
    api.mockRejectedValue(failure);
    await expect(generateStaticParams()).resolves.toEqual([]);
    expect(api).toHaveBeenCalledExactlyOnceWith("/recipes", { revalidate: 3600 });
  });
  it("uses live slugs when enumeration succeeds", async () => {
    api.mockResolvedValue({ recipes: [{ slug: "live-spice-stew" }, { slug: "live-tea-cake" }] });
    await expect(generateStaticParams()).resolves.toEqual([{ slug: "live-spice-stew" }, { slug: "live-tea-cake" }]);
  });
  it("does not substitute demo slugs for an empty or missing live collection", async () => {
    api.mockResolvedValueOnce({ recipes: [] });
    await expect(generateStaticParams()).resolves.toEqual([]);
    // Non-transport API failures become null in the existing API helper.
    api.mockRejectedValueOnce(Object.assign(new Error("No fixture collection"), { status: 404 }));
    await expect(generateStaticParams()).resolves.toEqual([]);
  });
  it("keeps request-time primary metadata and page failures visible to retry", async () => {
    const failure = new RequestFailure("Unavailable fixture API", 502, "api_unreachable");
    api.mockRejectedValue(failure);
    await expect(generateMetadata({ params: { slug: "live-spice-stew" } })).rejects.toBe(failure);
    await expect(RecipeDetailPage({ params: { slug: "live-spice-stew" } })).rejects.toBe(failure);
    expect(api).toHaveBeenCalledTimes(2);
    for (const [resource] of api.mock.calls) expect(resource).toBe("/recipes/live-spice-stew");
  });
});
