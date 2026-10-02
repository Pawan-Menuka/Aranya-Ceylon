import fs from "node:fs";
import { expect, it, vi } from "vitest";

it("boots production config without scanning authoring asset sources",async()=>{
  const scan=vi.spyOn(fs,"readdirSync").mockImplementation(()=>{throw new Error("Production boot attempted to scan source photographs");});
  try {
    const {default:configure}=await import("../../aranya-next/next.config.mjs");
    const config=configure("phase-production-server");
    const headers=await config.headers();
    expect(headers.some(rule=>rule.headers.some(header=>header.key==="Cache-Control"&&header.value.includes("immutable")))).toBe(true);
    expect(config.images.remotePatterns[0].hostname).toBe("res.cloudinary.com");
    expect(scan).not.toHaveBeenCalled();
  } finally {scan.mockRestore();}
});
