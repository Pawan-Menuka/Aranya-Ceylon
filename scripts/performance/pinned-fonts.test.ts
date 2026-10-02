import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const root = new URL("../../aranya-next/", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root));
const digest = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const manifest = JSON.parse(read("public/fonts/pinned/manifest.json").toString());
describe("exact accepted font pin", () => {
  it("pins every accepted binary with its exact content hash", () => {
    expect(manifest.files).toHaveLength(44);
    for (const file of manifest.files) { const bytes = read("public/fonts/pinned/" + file.file); expect(bytes.length).toBe(file.bytes); expect(digest(bytes)).toBe(file.sha256); expect(bytes.subarray(0, 4).toString()).toBe("wOF2"); }
  });
  it("keeps all face/range/metrics/swap rules and original variable roles", () => {
    const css = read("src/app/fonts.css").toString(); expect(digest(css)).toBe(manifest.css.sha256); expect((css.match(/@font-face/g) ?? []).length).toBe(73); expect(manifest.faces).toHaveLength(73);
    for (const face of manifest.faces) { if (face.src?.includes("woff2")) { expect(face["font-display"]).toBe("swap"); expect(face["unicode-range"]).toBeTruthy(); } else { expect(face["size-adjust"]).toBeTruthy(); expect(face["ascent-override"]).toBeTruthy(); expect(face["descent-override"]).toBeTruthy(); expect(face["line-gap-override"]).toBeTruthy(); } }
    const layout = read("src/app/layout.tsx").toString(); expect(layout).not.toContain("next/font/google"); expect(layout).toContain('__variable_6adbea __variable_a11773 __variable_cfa357'); expect(css).not.toContain("/_next/static/media/");
    expect(manifest.preloads).toEqual([]); expect(manifest.preloadEvidence.acceptedNextFontManifest.app).toEqual({});
  });
  it("ships all three upstream OFL notices with provenance and verified hashes", () => {
    expect(manifest.licenses).toHaveLength(3);
    for (const license of manifest.licenses) { const bytes = read("public/fonts/pinned/" + license.file); expect(digest(bytes)).toBe(license.sha256); expect(bytes.toString()).toContain("SIL OPEN FONT LICENSE Version 1.1"); expect(bytes.toString()).toContain(license.copyright); const url = new URL(license.source); expect(url.origin).toBe("https://raw.githubusercontent.com"); expect(url.pathname.startsWith("/google/fonts/")).toBe(true); }
  });
});
