import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { prepareMedia } from "../../aranya-next/scripts/prepare-media.mjs";
import { versionedImage } from "../../aranya-next/src/lib/media";

function fixture() {
  const root=path.resolve("artifacts/performance/media-generation-tests",crypto.randomUUID());
  for(const dir of ["public/images", "public/hero/desktop", "src/lib"])fs.mkdirSync(path.join(root,dir),{recursive:true});
  fs.writeFileSync(path.join(root,"public/images/photo.webp"),"original photo");
  fs.writeFileSync(path.join(root,"public/hero/poster.webp"),"original poster");
  fs.writeFileSync(path.join(root,"public/hero/desktop/frame_0001.webp"),"original frame");
  return root;
}

describe("content-versioned media",()=>{
  it("changes a replaced photo URL while preserving bytes at the old immutable URL",()=>{
    const root=fixture(),before=prepareMedia(root),source=path.join(root,"public/images/photo.webp");
    fs.writeFileSync(source,"replacement photo");const after=prepareMedia(root);
    expect(after.images["/images/photo.webp"]).not.toBe(before.images["/images/photo.webp"]);
    expect(fs.readFileSync(path.join(root,"public",before.images["/images/photo.webp"]),"utf8")).toBe("original photo");
    expect(fs.readFileSync(path.join(root,"public",after.images["/images/photo.webp"]),"utf8")).toBe("replacement photo");
    expect(after.heroPrefix).toBe(before.heroPrefix);
  });
  it("invalidates a changed sequence and retains the previous frame/poster generation",()=>{
    const root=fixture(),before=prepareMedia(root);
    fs.writeFileSync(path.join(root,"public/hero/desktop/frame_0001.webp"),"replacement frame");const after=prepareMedia(root);
    expect(after.heroPrefix).not.toBe(before.heroPrefix);
    expect(fs.readFileSync(path.join(root,"public",before.heroPrefix,"desktop/frame_0001.webp"),"utf8")).toBe("original frame");
    expect(fs.readFileSync(path.join(root,"public",after.heroPrefix,"desktop/frame_0001.webp"),"utf8")).toBe("replacement frame");
    expect(fs.readFileSync(path.join(root,"public",before.heroPrefix,"poster.webp"),"utf8")).toBe("original poster");
  });
  it("produces stable versions without changing original sources or rewriting a current manifest",()=>{
    const root=fixture(),before=prepareMedia(root),manifest=path.join(root,"src/lib/media-manifest.json");
    const written=fs.statSync(manifest).mtimeMs;expect(prepareMedia(root)).toEqual(before);
    expect(fs.statSync(manifest).mtimeMs).toBe(written);
    expect(fs.readFileSync(path.join(root,"public/images/photo.webp"),"utf8")).toBe("original photo");
    expect(fs.readFileSync(path.join(root,"public/hero/desktop/frame_0001.webp"),"utf8")).toBe("original frame");
  });
  it("keeps live Cloudinary URLs and explicit data images intact while versioning known local assets",()=>{
    const remote="https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";
    expect(versionedImage(remote)).toBe(remote);expect(versionedImage("data:image/png;base64,AA==")).toBe("data:image/png;base64,AA==");
    expect(versionedImage("/images/about/about-hero.webp")).toMatch(/^\/media\/[a-f0-9]{16}\/images\//);
    expect(versionedImage("/images/unknown.webp")).toBe("/images/unknown.webp");
  });
});
